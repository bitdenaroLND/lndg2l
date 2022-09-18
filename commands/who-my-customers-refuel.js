import dotenv from 'dotenv'
dotenv.config()
import {table} from 'table'

import { dbGetAll } from './db.js'
import { roundToNearest } from './math-utils.js'

export async function whoMyCustomerRefuel (days) {      
  const bestSources = await getBestSources(days)

  if (!bestSources) {
    return []
  }

  const totalRefuel = bestSources.reduce((total, source) => { return total + source.rebalance_value }, 0)  

  const targets = await getTargets(days)

  const dataTable = [
    ['Who my customers refuel', '', '', '', '', ''],
    ['Source Channel', 'Total Sent', 'ppm', 'Targets', '', '']
  ]

  const spanning = []
  
  bestSources.forEach(source => {
    const sourceTargets = targets.filter(target => target.chan_out === source.chan_out)    
    
    

    dataTable.push([source.chan_out.trim(), source.rebalance_value.toLocaleString(), roundToNearest(source.rebalance_ppm, 2).toLocaleString(), 'Target', 'Total Sent', 'ppm'])    
    spanning.push({ col: 0, row: dataTable.length - 1, rowSpan: sourceTargets.length + 1 } )
    spanning.push({ col: 1, row: dataTable.length - 1, rowSpan: sourceTargets.length + 1 } )
    spanning.push({ col: 2, row: dataTable.length - 1, rowSpan: sourceTargets.length + 1 } )
    
    sourceTargets.forEach(target => {
      dataTable.push(['', '', '', target.alias.trim(), target.rebalance_value.toLocaleString(), roundToNearest(target.rebalance_ppm, 2).toLocaleString()])
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

const getBestSources = async (days) => {
  const sql = `
  select
    gui_channels.alias chan_out,    
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
    gui_channels.alias
  order by    
    rebalance_value desc
  `

  const dbResult = await dbGetAll(sql)

  if (dbResult.length === 0) {
    return null
  }

  return dbResult
}

const getTargets = async (days) => {
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
      chan_out,
      rebalance_value desc
    `
  const dbResult = await dbGetAll(sql)

  return dbResult
}