import dotenv from 'dotenv'
dotenv.config()
import {table} from 'table'

import { dbGetAll } from './db.js'
import { roundToNearest } from './math-utils.js'

export async function biggestCustomerWithDestinations (days, topCustomer, topDestinations) {
  let sql = `
    SELECT      
      gui_channels.alias,            
      chan_id_in,
      count(1) totalForwards,
      sum(fee) fees
    from gui_forwards
    inner join gui_channels
    on
      gui_channels.chan_id = gui_forwards.chan_id_in
    where
      forward_date >= datetime('now','-${days} day')
    group BY
      gui_channels.alias,
      chan_id_in
    order by
      fees desc
    limit ${topCustomer}
  `
  const forwards = await dbGetAll(sql)

  if (forwards.length === 0) {
    return null
  }  

  const totalFees = forwards.reduce((total, forward) => { return total + forward.fees }, 0)  

  const dataTable = [
    [`How my business works`,'','','','','','',''],
    ['Clients that generate the most fees and their best destinations', '','','','','','',''],
    [`Top ${topCustomer} Customers`, 'Fee', '% Fees Total', 'Forwards', `Top ${topDestinations} Destinations`, 'Fee', '% Fees Total', 'Forwards']    
  ]

  const spanningRows = []
  
  for (const forward of forwards) {    
    sql = `
      SELECT
        gui_channels.alias,            
        count(1) totalForwards,
        sum(fee) fees
      from gui_forwards
      inner join gui_channels
      on
        gui_channels.chan_id = gui_forwards.chan_id_out
      where
        forward_date >= datetime('now','-${days} day')
        and chan_id_in = '${forward.chan_id_in}'
      group BY
        gui_channels.alias
      order by        
        fees desc
      limit ${topDestinations}  
    `

    const forwardDestinations = await dbGetAll(sql)    
    spanningRows.push({col: 0, row: dataTable.length, rowSpan: forwardDestinations.length, verticalAlignment: 'middle'})
    spanningRows.push({col: 1, row: dataTable.length, rowSpan: forwardDestinations.length, verticalAlignment: 'middle'})
    spanningRows.push({col: 2, row: dataTable.length, rowSpan: forwardDestinations.length, verticalAlignment: 'middle'})
    spanningRows.push({col: 3, row: dataTable.length, rowSpan: forwardDestinations.length, verticalAlignment: 'middle'})
    
    dataTable.push([
      forward.alias.replace(/[^\w.\s]/gi, '').trim(),
      roundToNearest(forward.fees, 2).toLocaleString(),
      roundToNearest((forward.fees / totalFees) * 100, 2),
      forward.totalForwards,
      forwardDestinations[0].alias.replace(/[^\w.\s]/gi, '').trim(),
      roundToNearest(forwardDestinations[0].fees, 2).toLocaleString(),
      roundToNearest((forwardDestinations[0].fees / forward.fees) * 100, 2),
      forwardDestinations[0].totalForwards
    ])

    forwardDestinations.shift()

    forwardDestinations.forEach(destination => {
      dataTable.push([
        '',
        '',
        '',
        '',
        destination.alias.replace(/[^\w.\s]/gi, '').trim(),
        roundToNearest(destination.fees, 2).toLocaleString(),
        roundToNearest((destination.fees / forward.fees) * 100, 2),
        destination.totalForwards
      ])
    })
  }

  const tableConfig = {
    columns: [
      { alignment: 'center' },
      { alignment: 'center', width: 15 },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' }
    ],
    spanningCells: [
      { col: 0, row: 0, colSpan: 8, alignment: 'center' },
      { col: 0, row: 1, colSpan: 8, alignment: 'center' },
      ...spanningRows
    ],
  }  

  return table(dataTable, tableConfig)

}