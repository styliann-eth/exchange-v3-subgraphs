/* eslint-disable prefer-const */
import { ONE_BD, ZERO_BD, ZERO_BI } from './constants'
import { Bundle, Pool, Token } from '../generated/schema'
import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { exponentToBigDecimal, safeDiv } from './index'
import { getOrLoadToken } from './entity'

// prettier-ignore
const WETH_ADDRESS = '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701'
// prettier-ignore
const USDC_WETH_03_POOL = '0xb4ea03fd982685c68279cfe6dd05dd26521c35dd'

const STABLE_IS_TOKEN0 = 'false' as string

// token where amounts should contribute to tracked volume and liquidity
// usually tokens that many tokens are paired with s
// prettier-ignore
export let WHITELIST_TOKENS: string[] = '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701,0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37,0xf817257fed379853cDe0fa4F97AB987181B1E5Ea,0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D,0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d,0x5387C85A4965769f6B0Df430638a1388493486F1,0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714,0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50,0xE0590015A873bF326bd645c3E1266d4db41C4E6B,0xc85548e0191cD34Be8092B0D42Eb4e45Eba0d581,0x3a98250F98Dd388C211206983453837C8365BDc1,0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3,0xb2f82D0f38dc453D596Ad40A37799446Cc89274A,0x07AabD925866E8353407E67C1D157836f7Ad923e,0xC8527e96c3CB9522f6E35e95C0A28feAb8144f15'.split(',')

// prettier-ignore
let STABLE_COINS: string[] = '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea,0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D'.split(',')

let MINIMUM_ETH_LOCKED = BigDecimal.fromString('0')

let Q192 = 2 ** 192
export function sqrtPriceX96ToTokenPrices(sqrtPriceX96: BigInt, token0: Token, token1: Token): BigDecimal[] {
  let num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal()
  let denom = BigDecimal.fromString(Q192.toString())
  let price1 = num.div(denom).times(exponentToBigDecimal(token0.decimals)).div(exponentToBigDecimal(token1.decimals))

  let price0 = safeDiv(BigDecimal.fromString('1'), price1)
  return [price0, price1]
}

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin
  let usdcPool = Pool.load(USDC_WETH_03_POOL) // dai is token0
  if (usdcPool !== null) {
    if (STABLE_IS_TOKEN0 === 'true') {
      return usdcPool.token0Price
    }
    return usdcPool.token1Price
  }
  return ZERO_BD
}

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(bundle: Bundle, token: Token): BigDecimal {
  if (token.id == WETH_ADDRESS) {
    return ONE_BD
  }
  let whiteList = token.whitelistPools
  // for now just take USD from pool with greatest TVL
  // need to update this to actually detect best rate based on liquidity distribution
  let largestLiquidityETH = ZERO_BD
  let priceSoFar = ZERO_BD

  // hardcoded fix for incorrect rates
  // if whitelist includes token - get the safe price
  if (STABLE_COINS.includes(token.id)) {
    priceSoFar = safeDiv(ONE_BD, bundle.ethPriceUSD)
  } else {
    for (let i = 0; i < whiteList.length; ++i) {
      let poolAddress = whiteList[i]
      let pool = Pool.load(poolAddress)
      if (pool === null) {
        continue
      }

      if (pool.liquidity.gt(ZERO_BI)) {
        if (pool.token0 == token.id) {
          // whitelist token is token1
          let token1 = getOrLoadToken(pool.token1)
          // get the derived ETH in pool
          let ethLocked = pool.totalValueLockedToken1.times(token1.derivedETH)
          if (
            ethLocked.gt(largestLiquidityETH) &&
            (ethLocked.gt(MINIMUM_ETH_LOCKED) || WHITELIST_TOKENS.includes(pool.token0))
          ) {
            largestLiquidityETH = ethLocked
            // token1 per our token * Eth per token1
            priceSoFar = pool.token1Price.times(token1.derivedETH as BigDecimal)
          }
        }
        if (pool.token1 == token.id) {
          let token0 = getOrLoadToken(pool.token0)
          // get the derived ETH in pool
          let ethLocked = pool.totalValueLockedToken0.times(token0.derivedETH)
          if (
            ethLocked.gt(largestLiquidityETH) &&
            (ethLocked.gt(MINIMUM_ETH_LOCKED) || WHITELIST_TOKENS.includes(pool.token1))
          ) {
            largestLiquidityETH = ethLocked
            // token0 per our token * ETH per token0
            priceSoFar = pool.token0Price.times(token0.derivedETH as BigDecimal)
          }
        }
      }
    }
  }
  return priceSoFar // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedAmountUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
): BigDecimal {
  let bundle = Bundle.load('1')
  let price0USD = token0.derivedETH.times(bundle.ethPriceUSD)
  let price1USD = token1.derivedETH.times(bundle.ethPriceUSD)

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(price0USD).plus(tokenAmount1.times(price1USD))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(price0USD).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount1.times(price1USD).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked amount is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedAmountETH(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
): BigDecimal {
  let derivedETH0 = token0.derivedETH
  let derivedETH1 = token1.derivedETH

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(derivedETH0).plus(tokenAmount1.times(derivedETH1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(derivedETH0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount1.times(derivedETH1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked amount is 0
  return ZERO_BD
}

export class AmountType {
  eth: BigDecimal
  usd: BigDecimal
  ethUntracked: BigDecimal
  usdUntracked: BigDecimal
}

export function getAdjustedAmounts(
  bundle: Bundle,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
): AmountType {
  let derivedETH0 = token0.derivedETH
  let derivedETH1 = token1.derivedETH

  let eth = ZERO_BD
  let ethUntracked = tokenAmount0.times(derivedETH0).plus(tokenAmount1.times(derivedETH1))

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    eth = ethUntracked
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    eth = tokenAmount0.times(derivedETH0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    eth = tokenAmount1.times(derivedETH1).times(BigDecimal.fromString('2'))
  }

  // Define USD values based on ETH derived values.
  let usd = eth.times(bundle.ethPriceUSD)
  let usdUntracked = ethUntracked.times(bundle.ethPriceUSD)

  return { eth, usd, ethUntracked, usdUntracked }
}
