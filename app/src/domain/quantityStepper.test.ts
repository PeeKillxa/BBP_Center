import { expect, it } from 'vitest'
import { getFarmService } from '../config/farming'
import { stepDiamondQuantity } from './farming'

const cfg = getFarmService('aa-diamond')!.diamond!
it('repairs over-cap and off-step quantities without jumping to the minimum', () => {
  expect(stepDiamondQuantity('300000', -1, cfg.custom)).toBe(250000)
  expect(stepDiamondQuantity('15000', -1, cfg.custom)).toBe(10000)
  expect(stepDiamondQuantity('15000', 1, cfg.custom)).toBe(20000)
  expect(stepDiamondQuantity(' 100,000 ', -1, cfg.custom)).toBe(90000)
  expect(stepDiamondQuantity('10000', -1, cfg.custom)).toBe(10000)
  expect(stepDiamondQuantity('250000', 1, cfg.custom)).toBe(250000)
  expect(stepDiamondQuantity('abc', 1, cfg.custom)).toBe(10000)
})
