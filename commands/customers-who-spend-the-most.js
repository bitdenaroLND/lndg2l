import dotenv from 'dotenv'
dotenv.config()
import {table} from 'table'

import { dbGetAll } from './db.js'

export async function customersWhoSpendTheMost (days) {  
  const sql = `
    SELECT
      gui_channels.alias,
      PRINTF("%,d", (select sum(fee) from gui_forwards where forward_date >= datetime('now','-${days} day'))) total_fees_in_periodo,
      round((cast(sum(fee) as float) / (select sum(fee) from gui_forwards where forward_date >= datetime('now','-${days} day'))) * 100, 2) participacao_canal_periodo,
      PRINTF("%,d", sum(fee)) total_fees,
      PRINTF("%,d", min(fee)) minimo_fees,
      PRINTF("%,d", max(fee)) maximo_fees,
      PRINTF("%,d", avg(fee)) media_fees,
      count(1) total_roteamentos
    from gui_forwards
    inner join gui_channels
    on
      gui_channels.chan_id = gui_forwards.chan_id_in
    where
      forward_date >= datetime('now','-${days} day')
    group BY
      gui_channels.alias
    order by
      sum(fee) desc;
  `

  const customers = await dbGetAll(sql)

  const dataTable = [
    [`Customer Who Spend The Most with ${days} day${days > 1 ? 's': ''}`,'','','','','',''],
    ['Channel', 'Fees', '% Participation', 'Min Fee', 'Max Fee', 'Avg Fee', 'Forwards']
  ]

  const tableConfig = {
    columns: [
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
    ],
    spanningCells: [
      { col: 0, row: 0, colSpan: 7 }
    ],
  }
  
  customers.forEach(customer => {
    dataTable.push([
      customer.alias,
      customer.total_fees,
      customer.participacao_canal_periodo.toString(),
      customer.minimo_fees,
      customer.maximo_fees,
      customer.media_fees,
      customer.total_roteamentos.toString()
    ])      
  })
    
  return table(dataTable, tableConfig)  

}