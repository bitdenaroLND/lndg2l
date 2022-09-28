import dotenv from 'dotenv'
dotenv.config()
import {table} from 'table'

import { dbGetAll } from './db.js'

export async function getBigGuys (days, minSats) {
  const [bigCustomers, bigDestinations] = await Promise.all([
    getBigCustomers(days, minSats),
    getBigDestinations(days, minSats)
  ])

  const dataTable = [
    ['Channels with biggest amount', '', '', '', '', '', ''],
    ['Customers', 'Max Amount', '', 'Destinations', 'Max Amount', 'AR up to Amount', 'Actual Amount']
  ]  

  bigCustomers.forEach(customer => {
    dataTable.push([
      customer.alias.replace(/[^\w.\s]/gi, '').trim(),
      customer.total.toLocaleString(),
      '',      
      '',
      '',
      '',
      ''
    ])
  })  

  bigDestinations.forEach((destination, index) => {
    if (dataTable[index + 2]) {
      dataTable[index + 2][3] = destination.alias.replace(/[^\w.\s]/gi, '').trim()
      dataTable[index + 2][4] = destination.total.toLocaleString()
      dataTable[index + 2][5] = destination.arUpTo.toLocaleString()
      dataTable[index + 2][6] = destination.local_balance.toLocaleString()
    } else {
      dataTable.push([
        '',        
        '',
        '',
        destination.alias.replace(/[^\w.\s]/gi, '').trim(),
        destination.total.toLocaleString(),
        destination.arUpTo.toLocaleString(),
        destination.local_balance.toLocaleString()
      ])
    }
  })  

  const tableConfig = {
    columns: [
      { alignment: 'left' },
      { alignment: 'center' },      
      { alignment: 'center' },
      { alignment: 'left' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' }
    ],
    spanningCells: [
      { col: 0, row: 0, colSpan: 7, alignment: 'center' },    
    ],
  }

  return table(dataTable, tableConfig)
  
  
}

const getBigCustomers = async (days, minSats) => {
  const sql = `
  select  
    gui_channels.alias,
    max(amount) total
  from gui_failedhtlcs
  inner join gui_channels
  on
    gui_channels.chan_id = chan_id_in
  where
    timestamp >= datetime('now','-${days} day')
  group by
    gui_channels.alias
  having
    max(amount) > ${minSats}
  order by
    total desc
  `

  const dbResult = await dbGetAll(sql)

  return dbResult
}

const getBigDestinations = async (days, minSats) => {
  const sql = `
  select  
    gui_channels.alias,
    (cast((100 - ar_in_target) as float) / 100) * capacity arUpTo,
    local_balance,
    max(amount) total
  from gui_failedhtlcs
  inner join gui_channels
  on
    gui_channels.chan_id = gui_failedhtlcs.chan_id_out
  where
    timestamp >= datetime('now','-${days} day')
  group by
    gui_channels.alias,
    ar_in_target,
    local_balance,
    capacity
  having
    max(amount) > ${minSats}
  order by
    total desc
  `

  const dbResult = await dbGetAll(sql)

  return dbResult
}