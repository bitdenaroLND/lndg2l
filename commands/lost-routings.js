import dotenv from 'dotenv'
dotenv.config()
import {table} from 'table'

import { dbGetAll } from './db.js'
import { roundToNearest } from './math-utils.js'

export async function lostRoutings (hours) {   
  const [totalLostFees, lostReasons, loses] = await Promise.all([
    getTotalLostFees(hours),
    getLostReasons(hours),
    getLoses(hours)
  ])

  if (!totalLostFees) {
    return []
  }
  
  const dataTable = [
    [`Lost Routings with ${hours} hour${hours > 1 ? 's' : ''}`,'','','','','','','','','','','','','']    
  ] 

  const spanning = []
  
  for (const reason of lostReasons) {
    const losesByReason = loses.filter(lose => lose.wire_failure === reason.wire_failure)
    
    dataTable.push(['Reason', '% Ratio', 'Channels','','','','','','','','','','',''])    
    dataTable.push([
      reason.wire_failure_description,      
      roundToNearest((reason.total / totalLostFees) * 100, 2),     
      'Channel',
      'Fees Lost',
      '% Ratio',
      'Fee Rate',
      'Total Amount',
      'Max Amount',
      'Avg Amount',
      'Attempts',
      'Last 5 Forwards',
      '',
      'Last 5 Rebalances',      
      ''
    ])
    
    spanning.push({ col: 0, row: dataTable.length - 1, rowSpan: (losesByReason.length * 6 ) + 1, verticalAlignment: 'middle' })    
    spanning.push({ col: 1, row: dataTable.length - 1, rowSpan: (losesByReason.length * 6) + 1, verticalAlignment: 'middle' })    
    spanning.push({ col: 2, row: dataTable.length - 2, colSpan: 12, alignment: 'center' })        
    spanning.push({ col: 10, row: dataTable.length - 1, colSpan: 2, alignment: 'center' })        
    spanning.push({ col: 12, row: dataTable.length - 1, colSpan: 2, alignment: 'center' })        
    
    for (const lose of losesByReason) {
      dataTable.push([
        '',
        '',
        lose.alias.replace(/[^\w.\s]/gi, ''),
        lose.totalMissedFee.toLocaleString(),
        roundToNearest((lose.totalMissedFee / reason.total) * 100, 2),
        lose.chanelCurrentFee.toLocaleString(),
        lose.totalAmount.toLocaleString(),
        lose.maxAmount,          
        lose.avgAmount,          
        lose.tentativas
        ,'When'
        ,'ppm'
        ,'When'
        ,'ppm'              
      ])
      
      spanning.push({ col: 2, row: dataTable.length - 1, rowSpan: 6, verticalAlignment: 'middle' })
      spanning.push({ col: 3, row: dataTable.length - 1, rowSpan: 6, verticalAlignment: 'middle' })
      spanning.push({ col: 4, row: dataTable.length - 1, rowSpan: 6, verticalAlignment: 'middle' })
      spanning.push({ col: 5, row: dataTable.length - 1, rowSpan: 6, verticalAlignment: 'middle' })
      spanning.push({ col: 6, row: dataTable.length - 1, rowSpan: 6, verticalAlignment: 'middle' })
      spanning.push({ col: 7, row: dataTable.length - 1, rowSpan: 6, verticalAlignment: 'middle' })
      spanning.push({ col: 8, row: dataTable.length - 1, rowSpan: 6, verticalAlignment: 'middle' })      
      spanning.push({ col: 9, row: dataTable.length - 1, rowSpan: 6, verticalAlignment: 'middle' })      
      

      const lastFive = await getLastFive(lose)

      dataTable.push(['','','','','','','','','','', lastFive[0].forwardTime, roundToNearest(lastFive[0].forwardAmount, 2).toLocaleString(),lastFive[0].rebalanceTime, roundToNearest(lastFive[0].rebalancePpm, 2).toLocaleString()])
      dataTable.push(['','','','','','','','','','', lastFive[1].forwardTime, roundToNearest(lastFive[1].forwardAmount, 2).toLocaleString(),lastFive[1].rebalanceTime, roundToNearest(lastFive[1].rebalancePpm, 2).toLocaleString()])
      dataTable.push(['','','','','','','','','','', lastFive[2].forwardTime, roundToNearest(lastFive[2].forwardAmount, 2).toLocaleString(),lastFive[2].rebalanceTime, roundToNearest(lastFive[2].rebalancePpm, 2).toLocaleString()])
      dataTable.push(['','','','','','','','','','', lastFive[3].forwardTime, roundToNearest(lastFive[3].forwardAmount, 2).toLocaleString(),lastFive[3].rebalanceTime, roundToNearest(lastFive[3].rebalancePpm, 2).toLocaleString()])
      dataTable.push(['','','','','','','','','','', lastFive[4].forwardTime, roundToNearest(lastFive[4].forwardAmount, 2).toLocaleString(),lastFive[4].rebalanceTime, roundToNearest(lastFive[4].rebalancePpm, 2).toLocaleString()])
    }

    dataTable.push(['', '', '', '', '', '', '', '','','','','','',''])
    spanning.push({ col: 0, row: dataTable.length - 1, colSpan: 14 })        
  }

  const tableConfig = {
    columns: [
      { alignment: 'center', width: 15, wrapWord: true },
      { alignment: 'center' },        
      { alignment: 'center' },        
      { alignment: 'center', width: 20, wrapWord: true },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'center', wrapWord: true },
      { alignment: 'center', wrapWord: true },
    ],
    spanningCells: [
      { col: 0, row: 0, colSpan: 14 },
      ...spanning      
    ],
  }

  return table(dataTable, tableConfig)
}

const getTotalLostFees = async (hours) => {
  const sql = `
  select
    sum(missed_fee) total
  from gui_failedhtlcs  
  inner join gui_channels
  on
    gui_channels.chan_id = gui_failedhtlcs.chan_id_out
    and gui_channels.is_active = 1
    and gui_channels.is_open = 1
  where
      timestamp >= datetime('now','-${hours} hour')
  `

  const dbResult = await dbGetAll(sql)

  if (dbResult.length === 0) {
    return null
  }

  return dbResult[0].total
}

const getLostReasons = async (hours) => {
  const sql = `
  select
    wire_failure,
    case
      when gui_failedhtlcs.wire_failure = 15 then 'Temporary Channel Failure'
      when gui_failedhtlcs.wire_failure = 18 then 'Unknown Next Peer'
      when gui_failedhtlcs.wire_failure = 12 then 'Fee Insufficient'
      else 'undefined'
    end wire_failure_description,
    
    /*case
      when gui_failedhtlcs.failure_detail = 1 then '----'
      when gui_failedhtlcs.failure_detail = 5 then 'HTLC Exceeds Max'
      when gui_failedhtlcs.failure_detail = 6 then 'Insufficient Balance'
      when gui_failedhtlcs.failure_detail = 13 then 'Invoice Not Open'
      when gui_failedhtlcs.failure_detail = 20 then 'Invalid Keysend'
      when gui_failedhtlcs.failure_detail = 22 then 'Circular Route'
      else 'undefined'
    end failure_detail_description,*/
    
    sum(missed_fee) total    
  from gui_failedhtlcs
  inner join gui_channels
  on
    gui_channels.chan_id = gui_failedhtlcs.chan_id_out
    and gui_channels.is_active = 1
    and gui_channels.is_open = 1
  where
    timestamp >= datetime('now','-${hours} hour')
  group by    
    wire_failure    
  order by
    total desc;
  `
  const dbResult = await dbGetAll(sql)

  return dbResult
}

const getLoses = async (hours) => {
  const sql = `
  select
    gui_channels.alias,
    chan_id_out,
    wire_failure,
    gui_channels.local_fee_rate chanelCurrentFee,
    sum(amount) totalAmount,
    PRINTF("%,d", max(amount)) maxAmount,      
    PRINTF("%,d", avg(amount)) avgAmount,          
    sum(missed_fee) totalMissedFee,      
    count(1) tentativas    
  from gui_failedhtlcs
  inner join gui_channels
  on
    gui_channels.chan_id = gui_failedhtlcs.chan_id_out
    and gui_channels.is_active = 1
    and gui_channels.is_open = 1
  where
    timestamp >= datetime('now','-${hours} hour')   
  group by
    gui_channels.alias,
    wire_failure,
    chan_id_out,
    gui_channels.local_fee_rate
  order by
    wire_failure,
    totalMissedFee desc;
  `

  const dbResult = await dbGetAll(sql)

  return dbResult

}

const getLastForwards = async (chanIdOut) => {  
  const sql = `
  select
    Cast( (JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) minutes,
    (fee / (amt_out_msat / 1000)) * 1000000 ppm
  from gui_forwards
  where
    chan_id_out = '${chanIdOut}'
  order by
    forward_date desc
  limit 5
  `
  const dbResult = await dbGetAll(sql)

  if (dbResult.length === 0) {
    return null
  }

  return dbResult
}

const getLastRebalances = async (chanOutAlias) => {
  const sql = `
  select
    Cast ((JulianDay(datetime('now')) - JulianDay(requested)) * 24 * 60 As Integer) minutes,
    case
      when status = 2 then 'Successful'
      when status = 3 then 'Timeout'
      when status = 4 then 'No Route'
      when status = 5 then 'Error'
      when status = 6 then 'Incorrect Payment Details'
      when status = 7 then 'Insufficient Balance'
      when status = 400 then 'Rebalancer Request Failed'
      when status = 408 then 'Rebalancer Request Timeout'
      else 'undefined'
    end rebalanceStatus,
    (coalesce(fees_paid, fee_limit) / value) * 1000000 ppm
  from gui_rebalancer
  where
    target_alias = '${chanOutAlias}'
    and status = 2
  order by
    requested desc
  limit 5
  `

  const dbResult = await dbGetAll(sql)

  if (dbResult.length === 0) {
    return null
  }

  return dbResult
}

const getLastFive = async (lose) => {
  const lastForwards = await getLastForwards(lose.chan_id_out)      
  const lastRebalances = await getLastRebalances(lose.alias)

  const last = []

  for (let i = 0; i < 5; i++) {
    last.push({forwardTime: '', forwardAmount: '', rebalanceTime: '', rebalanceStatus: '', rebalancePpm: ''},)
  }

  if (lastForwards) {    
    lastForwards.forEach((forward, index) => {
      if (forward.minutes < 60) {
        last[index].forwardTime = `${forward.minutes} minute${forward.minutes > 1 ? 's': ''} a go`
      } else {
        const hours = Math.trunc(forward.minutes / 60)
        if (hours < 48) {
            last[index].forwardTime = `${hours} hour${hours > 1 ? 's' : ''} a go`
        } else {
          const days = Math.trunc(hours / 24)
          last[index].forwardTime = `${days} days a go`                  
        }
      }
      last[index].forwardAmount = forward.ppm.toLocaleString()
    })
  }

  if (lastRebalances) {
    lastRebalances.forEach((rebalance, index) => {
      if (rebalance.minutes < 120) {
        last[index].rebalanceTime = `${rebalance.minutes} minute${rebalance.minutes > 1 ? 's': ''} a go`
      } else {
        const hours = Math.trunc(rebalance.minutes / 60)
        if (hours < 48) {
          last[index].rebalanceTime = `${hours} hours a go`        
        } else {
          const days = Math.trunc(hours / 24)
          last[index].rebalanceTime = `${days} days a go`                  
        }
      }
      last[index].rebalanceStatus = rebalance.rebalanceStatus
      last[index].rebalancePpm = rebalance.ppm
    })
  }

  return last
}

