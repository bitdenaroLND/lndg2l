import dotenv from 'dotenv'
dotenv.config()
import {table} from 'table'

import { dbGetAll } from './db.js'
import { roundToNearest } from './math-utils.js'

export async function destinationGenerateMostFees (days) {        
  const sql = `
  SELECT
    gui_channels.alias,
    PRINTF("%,d", (select sum(fee) from gui_forwards where forward_date >= datetime('now','-${days} day'))) total_fees_in_periodo,
    round((cast(sum(fee) as float) / (select sum(fee) from gui_forwards where forward_date >= datetime('now','-${days} day'))) * 100, 2) participacao_canal_periodo,
    PRINTF("%,d", sum(fee)) total_fees,
    PRINTF("%,d", max(fee)) maximo_fees,
    count(1) total_roteamentos
  from gui_forwards
  inner join gui_channels
  on
    gui_channels.chan_id = gui_forwards.chan_id_out
  where
    forward_date >= datetime('now','-${days} day')
  group BY
    gui_channels.alias
  order by sum(fee) desc;
  `
  const dataTable = [
    [`Destination that generate the most fees with ${days} day${days > 1 ? 's': ''}`,'','','','',''],
    ['Channel', 'Fees', '% Ratio', '% Accumulated', 'Highest rate in a routing', 'Forwards']
  ]

  const tableConfig = {
    columns: [
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
    ],
    spanningCells: [
      { col: 0, row: 0, colSpan: 6 }
    ],
  }

  let totalFees = 0

  const destinations = await dbGetAll(sql)
  let accumulated = 0

  destinations.forEach(destination => {
    accumulated += destination.participacao_canal_periodo
    if (totalFees == 0) {
      totalFees = destination.total_fees_in_periodo
    }
    dataTable.push([
      destination.alias,
      destination.total_fees,
      destination.participacao_canal_periodo,        
      roundToNearest(accumulated, 2),
      destination.maximo_fees,        
      destination.total_roteamentos.toString()
    ])
    
  })    
  
  dataTable.push([
    'Totals', totalFees, 100, '', '', ''
  ])  

  return table(dataTable, tableConfig) 
 
}
