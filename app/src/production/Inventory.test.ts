import { describe, expect, it } from 'vitest'
import { groupListings } from './Inventory'
import type { Listing } from './api'

const listing = (id: string, status: string, groupId?: string) => ({ id, status, groupId, title: id } as Listing)
describe('stock cards', () => {
  it('keeps legacy products separate and picks an available account for each group', () => {
    const result = groupListings([listing('sold', 'sold', 'group'), listing('reserved', 'reserved', 'group'), listing('ready', 'available', 'group'), listing('ready2', 'available', 'group'), listing('old', 'available')])
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ id: 'ready', stock: 2, status: 'available' })
    expect(result[1]).toMatchObject({ id: 'old', stock: 1 })
  })
  it('does not report reserved or sold accounts as available stock', () => {
    expect(groupListings([listing('a', 'sold', 'g'), listing('b', 'reserved', 'g')])[0].stock).toBe(0)
    expect(groupListings([listing('a', 'sold', 'g'), listing('b', 'reserved', 'g')])[0].status).toBe('reserved')
  })
})
