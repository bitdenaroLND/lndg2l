import dotenv from 'dotenv'
dotenv.config()
import {table} from 'table'

import { dbGetAll } from './db.js'
import { roundToNearest } from './math-utils.js'

export async function destinationsRefuelledBy (days) {      
  const destinations = await getDestinations(days)

  if (!destinations) {
    return []
  }  

  const totalRefuel = destinations.reduce((total, source) => { return total + source.rebalance_value }, 0)  

  const sources = await getSources(days)

  const dataTable = [
    ['Destinations refuelled by', '', '', '', '', ''],
    ['Destination Channel', 'Total Received', 'ppm', 'Sources', '', '']
  ]

  const spanning = []
  
  destinations.forEach(destination => {
    const destinationSources = sources.filter(source => source.alias === destination.alias)    
    
    

    dataTable.push([destination.alias.replace(/[^\w.\s]/gi, '').trim(), destination.rebalance_value.toLocaleString(), roundToNearest(destination.rebalance_ppm, 2).toLocaleString(), 'Source', 'Total Received', 'ppm'])    
    spanning.push({ col: 0, row: dataTable.length - 1, rowSpan: destinationSources.length + 1 } )
    spanning.push({ col: 1, row: dataTable.length - 1, rowSpan: destinationSources.length + 1 } )
    spanning.push({ col: 2, row: dataTable.length - 1, rowSpan: destinationSources.length + 1 } )
    
    destinationSources.forEach(source => {
      dataTable.push(['', '', '', source.chan_out.replace(/[^\w.\s]/gi, '').trim(), source.rebalance_value.toLocaleString(), roundToNearest(source.rebalance_ppm, 2).toLocaleString()])
    })
  })

  const tableConfig = {
    columns: [
      { alignment: 'center', width: 20 },
      { alignment: 'center' },
      { alignment: 'center', width: 10 },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' }
    ],
    spanningCells: [
      { col: 0, row: 0, colSpan: 6, alignment: 'center' },
      { col: 3, row: 1, colSpan: 3, alignment: 'center' },
      ...spanning
    ]
  }

  return table(dataTable, tableConfig)

}

const getDestinations = async (days) => {
  const sql = `
  select
    target_alias alias,    
    sum(value) rebalance_value,
    avg((fees_paid / value) * 1000000) rebalance_ppm
  from gui_rebalancer  
  where
    gui_rebalancer.requested >= datetime('now','-${days} day')
    and gui_rebalancer.status = 2
  group by
    target_alias
  order by    
    rebalance_value desc
  `

  const dbResult = await dbGetAll(sql)

  if (dbResult.length === 0) {
    return null
  }

  return dbResult
}

const getSources = async (days) => {
  const sql = `
    select
      gui_channels.alias chan_out,
      target_alias alias,
      sum(value) rebalance_value,
      avg((fees_paid / value) * 1000000) rebalance_ppm
    from gui_rebalancer
    inner join gui_paymenthops
    on
      gui_paymenthops.payment_hash_id = gui_rebalancer.payment_hash
      and gui_paymenthops.step = 1
    inner join gui_channels
    on
      gui_channels.chan_id = gui_paymenthops.chan_id
    where
      gui_rebalancer.requested >= datetime('now','-${days} day')
      and gui_rebalancer.status = 2
    group by
      gui_channels.alias,
      target_alias      
    order by
      target_alias,
      rebalance_value desc
    `
  const dbResult = await dbGetAll(sql)

  return dbResult
}