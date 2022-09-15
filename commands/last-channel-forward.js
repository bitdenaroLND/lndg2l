import dotenv from 'dotenv'
dotenv.config()
import {table} from 'table'

import { dbGetAll } from './db.js'
import { roundToNearest } from './math-utils.js'

export async function lastChannelForward () {
  const sql = `
  select    
    alias,
    local_balance,
    ar_in_target,
    (cast((100 - ar_in_target) as float) / 100) * capacity arUpTo,
    capacity,
    coalesce(min(Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) As float)), 99999999) lastForward
  from gui_channels
  left join gui_forwards
  on
    gui_forwards.chan_id_in = gui_channels.chan_id or chan_id_out = gui_channels.chan_id
  where
    is_active = 1
    and is_open = 1
  group by
    alias,
    local_balance,
    remote_balance,
    capacity
  order by
    lastForward desc
  `

  const dbResult = await dbGetAll(sql)  

  if (dbResult.length === 0) {
    return []
  }

  const dataTable = [
    ['Last Channel Forwards', '', '', '', ''],
    ['Last forward (days)', 'Channel', 'Capacity', 'Local Balance', 'AR to Amount']
  ]

  const tableConfig = {
    columns: [
      { alignment: 'center' },
      { alignment: 'left' },
      { alignment: 'right' },
      { alignment: 'right' },
      { alignment: 'right' }
    ],
    spanningCells: [
      { col: 0, row: 0, colSpan: 5 } 
    ]
  }
  
  dbResult.forEach(channel => {
    dataTable.push([
      channel.lastForward === 99999999 ? 'never' : roundToNearest(channel.lastForward, 2),
      channel.alias,
      channel.capacity.toLocaleString(),
      `${channel.local_balance.toLocaleString()} (${roundToNearest((channel.local_balance / channel.capacity) * 100, 2)}%)`,
      `${roundToNearest(channel.arUpTo, 2).toLocaleString()} (${100 - channel.ar_in_target}%)`
    ])
  })

  return table(dataTable, tableConfig)
}

