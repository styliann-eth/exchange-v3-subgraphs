const WMON = '0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701';
const WETH = '0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37';
const USDC = '0xf817257fed379853cDe0fa4F97AB987181B1E5Ea';
const USDT = '0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D';
const WBTC = '0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d';
const WSOL = '0x5387C85A4965769f6B0Df430638a1388493486F1';
const DAK = '0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714';
const YAKI = '0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50';
const CHOG = '0xE0590015A873bF326bd645c3E1266d4db41C4E6B';
const NSTR = '0xc85548e0191cD34Be8092B0D42Eb4e45Eba0d581';
const shMON = '0x3a98250F98Dd388C211206983453837C8365BDc1';
const gMON = '0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3';
const aprMON = '0xb2f82D0f38dc453D596Ad40A37799446Cc89274A';
const sMON = '0x07AabD925866E8353407E67C1D157836f7Ad923e';
const MAD = '0xC8527e96c3CB9522f6E35e95C0A28feAb8144f15';

/**
 * @type import('./config').NetworkConfig
 */
module.exports = {
  network: 'monad-testnet',
  wNativeAddress: WMON,
  v3: {
    // WMON-USDC 500
    wNativeStablePoolAddress: '0xb4ea03fd982685c68279cfe6dd05dd26521c35dd',
    stableIsToken0: false,
    factoryAddress: '0x7c47EB60ceDeBCeA438950d3582e9Df53d057B15',
    startBlock: 6794434,
    stableCoins: [USDC, USDT],
    whitelistAddresses: [
      WMON,
      WETH,
      USDC,
      USDT,
      WBTC,
      WSOL,
      DAK,
      YAKI,
      CHOG,
      NSTR,
      shMON,
      gMON,
      aprMON,
      sMON,
      MAD,
    ],
    nonfungiblePositionManagerAddress:
      '0x46a15b0b27311cedf172ab29e4f4766fbe7f4364',
    nonfungiblePositionManagerStartBlock: 6977,
    minETHLocked: 0,
  },
  v2: {
    factoryAddress: '0x82438CE666d9403e488bA720c7424434e8Aa47CD',
    startBlock: 3122415,
    wNativeStablePair0: '0xe11216f691d924D224CD69240670EfA1Fa43ECfc', // WMON-USDC
    whitelistAddresses: [
      WMON,
      WETH,
      USDC,
      USDT,
      WBTC,
      WSOL,
      DAK,
      YAKI,
      CHOG,
      NSTR,
      shMON,
      gMON,
      aprMON,
      sMON,
      MAD,
    ],
    minETHLocked: 1,
  },
};
