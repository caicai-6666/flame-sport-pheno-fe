export const PRODUCT_TIERS = [
  {
    key: 'crazy',
    label: '疯狂积分兑',
    title: '疯狂积分兑',
    min: 550
  },
  {
    key: 'tier-20',
    title: '积分20',
    pointsTitle: 20,
    max: 20
  },
  {
    key: 'tier-30',
    title: '积分30',
    pointsTitle: 30,
    max: 30
  },
  {
    key: 'tier-40',
    title: '积分40',
    pointsTitle: 40,
    max: 40
  },
  {
    key: 'tier-50',
    title: '积分50',
    pointsTitle: 50,
    max: 50
  },
  {
    key: 'tier-60',
    title: '积分60',
    pointsTitle: 60,
    max: 60
  },
  {
    key: 'tier-80',
    title: '积分80',
    pointsTitle: 80,
    max: 80
  },
  {
    key: 'tier-100',
    title: '积分100',
    pointsTitle: 100,
    max: 100
  },
  {
    key: 'tier-150',
    title: '积分150',
    pointsTitle: 150,
    max: 150
  },
  {
    key: 'tier-200',
    title: '积分200',
    pointsTitle: 200,
    max: 200
  },
  {
    key: 'tier-550',
    title: '200+奖品',
    maxExclusive: 550
  }
]

function previousTierMax(tier) {
  const currentIndex = PRODUCT_TIERS.findIndex(item => item.key === tier.key)
  const previousThresholds = PRODUCT_TIERS
    .slice(0, currentIndex)
    .map(item => item.max || 0)

  return Math.max(0, ...previousThresholds)
}

export function isProductInTier(product, tier) {
  if (typeof tier.min === 'number') {
    return product.pointsRequired >= tier.min
  }

  if (typeof tier.max === 'number') {
    const previousMax = previousTierMax(tier)
    return product.pointsRequired > previousMax && product.pointsRequired <= tier.max
  }

  if (typeof tier.maxExclusive === 'number') {
    const previousMax = previousTierMax(tier)
    return product.pointsRequired > previousMax && product.pointsRequired < tier.maxExclusive
  }

  return false
}

export function groupProductsByTier(products) {
  return PRODUCT_TIERS
    .map(tier => ({
      ...tier,
      items: products
        .filter(product => isProductInTier(product, tier))
        .sort((current, next) => current.pointsRequired - next.pointsRequired)
    }))
    .filter(tier => tier.items.length)
}
