import dotenv from 'dotenv'
dotenv.config()
import {table} from 'table'

import { dbGetAll } from './db.js'

export async function last24HoursForwards () {

  const [lastHoursForwards, lastHoursFailedHTLCs, totalForwardsLastWeek, totalFailedLastWeek] = await Promise.all([
    getLast24HoursForwards(),
    getLast24HoursFailedHTLCs(),
    getTotalForwards(7),
    getTotalFailedHTLCs(7)
  ])

  /*const [totalForwardsLastWeek, totalForwardsYesterday, totalOnChainLastWeek, totalOnChainYesterday] = await Promise.all([
    getTotalForwards(7),
    getTotalForwards(1),
    getTotalOnChainCost(1),
    getTotalOnChainCost(7)
  ])*/ 

  const averageForwardsLastWeek = Math.ceil(totalForwardsLastWeek.forwards / 7).toLocaleString()
  const averageFeeLastWeek = Math.ceil(totalForwardsLastWeek.fees / 7).toLocaleString()

  const averageFailedLastWeek = Math.ceil(totalFailedLastWeek.failed / 7).toLocaleString()
  const averageFailedFeeLastWeek = Math.ceil(totalFailedLastWeek.failedFees / 7).toLocaleString()


  const {
    lastForward, lastMinutes, lastHour, lastTwoHours, lastThreeHours, lastFourHours, lastFiveHours, total,
    feeLastMinutes, feeLastHour, feeLastTwoHours, feeLastThreeHours, feeLastFourHours, feeLastFiveHours, totalFee
  } = lastHoursForwards

  const {
    lastFailed, lastMinutesFailed, lastHourFailed, lastTwoHoursFailed, lastThreeHoursFailed, lastFourHoursFailed, lastFiveHoursFailed, totalFailed,
    feeLastMinutesFailed, feeLastHourFailed, feeLastTwoHoursFailed, feeLastThreeHoursFailed, feeLastFourHoursFailed, feeLastFiveHoursFailed, totalFeeFailed
  } = lastHoursFailedHTLCs
  

  
  const dataTable = [
    ['Forwards and Failed HTLCs from the last 24 hours','', '', '', ''],    
    [`Last Forward: ${lastForward} minute${lastForward >1 ? 's' : ''} a go`, '', `Last Failed HTLCs: ${lastFailed} minute${lastFailed > 1 ? 's' : ''} a go`, '', ''],
    ['When', 'Forwards', '','Failed HTLCs', ''],
    ['','Count', 'Fees', 'Count', 'Fees'],
    ['less than an hour', lastMinutes, feeLastMinutes.toLocaleString(),  lastMinutesFailed, feeLastMinutesFailed.toLocaleString()],
    ['an hour ago', lastHour, feeLastHour.toLocaleString(), lastHourFailed, feeLastHourFailed.toLocaleString()],
    ['2 hours ago', lastTwoHours, feeLastTwoHours.toLocaleString(), lastTwoHoursFailed, feeLastTwoHoursFailed.toLocaleString()],
    ['3 hours ago', lastThreeHours, feeLastThreeHours.toLocaleString(), lastThreeHoursFailed, feeLastThreeHoursFailed.toLocaleString()],
    ['4 hours ago', lastFourHours, feeLastFourHours.toLocaleString(), lastFourHoursFailed, feeLastFourHoursFailed.toLocaleString()],
    ['5 hours ago', lastFiveHours, feeLastFiveHours.toLocaleString(), lastFiveHoursFailed, feeLastFiveHoursFailed.toLocaleString()],   
    ['Last 24 hours TOTAL', total, totalFee.toLocaleString(), totalFailed, totalFeeFailed.toLocaleString()],    
    ['Average in the last 7 days', averageForwardsLastWeek, averageFeeLastWeek, averageFailedLastWeek, averageFailedFeeLastWeek]
  ]  

  const tableConfig = {
    columns: [
      { alignment: 'center' },
      { alignment: 'center' },
      { alignment: 'left' },
      { alignment: 'center' },
      { alignment: 'center' }
    ],
    spanningCells: [
      { col: 0, row: 0, colSpan: 5, alignment: 'center' },
      { col: 0, row: 1, colSpan: 2, alignment: 'center', },
      { col: 2, row: 1, colSpan: 3, alignment: 'center' },
      { col: 0, row: 2, rowSpan: 2, alignment: 'center' },      
      { col: 1, row: 2, colSpan: 2, alignment: 'center' },
      { col: 3, row: 2, colSpan: 2, alignment: 'center' },
      
    ],
  }

  return table(dataTable, tableConfig)

}

const getLast24HoursFailedHTLCs = async () => {
  const sql = `
  SELECT
    coalesce(min(Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer)),0) lastFailed,

    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) < 60 then 1 else 0 end),0) lastMinutesFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 60 and 119 then 1 else 0 end),0) lastHourFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 120 and 239 then 1 else 0 end),0) lastTwoHoursFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 240 and 299 then 1 else 0 end),0) lastThreeHoursFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 300 and 359 then 1 else 0 end),0) lastFourHoursFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 360 and 419 then 1 else 0 end),0) lastFiveHoursFailed,

    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) < 60 then missed_fee else 0 end),0) feeLastMinutesFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 60 and 119 then missed_fee else 0 end),0) feeLastHourFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 120 and 239 then missed_fee else 0 end),0) feeLastTwoHoursFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 240 and 299 then missed_fee else 0 end),0) feeLastThreeHoursFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 300 and 359 then missed_fee else 0 end),0) feeLastFourHoursFailed,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(timestamp)) * 24 * 60 As Integer) between 360 and 419 then missed_fee else 0 end),0) feeLastFiveHoursFailed,

    count(1) totalFailed,
    coalesce(sum(missed_fee),0) totalFeeFailed
  from gui_failedhtlcs
  where
    timestamp >= datetime('now','-1 day')
  order by timestamp desc;
  `

  const dbResult = await dbGetAll(sql)    
  
  return dbResult[0]
}

const getLast24HoursForwards = async () => {
  const sql = `
  SELECT
    coalesce(min(Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer)),0) lastForward,

    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) < 60 then 1 else 0 end),0) lastMinutes,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 60 and 119 then 1 else 0 end),0) lastHour,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 120 and 239 then 1 else 0 end),0) lastTwoHours,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 240 and 299 then 1 else 0 end),0) lastThreeHours,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 300 and 359 then 1 else 0 end),0) lastFourHours,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 360 and 419 then 1 else 0 end),0) lastFiveHours,

    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) < 60 then fee else 0 end),0) feeLastMinutes,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 60 and 119 then fee else 0 end),0) feeLastHour,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 120 and 239 then fee else 0 end),0) feeLastTwoHours,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 240 and 299 then fee else 0 end),0) feeLastThreeHours,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 300 and 359 then fee else 0 end),0) feeLastFourHours,
    coalesce(sum(case when Cast ((JulianDay(datetime('now')) - JulianDay(forward_date)) * 24 * 60 As Integer) between 360 and 419 then fee else 0 end),0) feeLastFiveHours,

    count(1) total,
    coalesce(sum(fee),0) totalFee
  from gui_forwards
  where
    forward_date >= datetime('now','-1 day')
  order by forward_date desc;
  `

  const dbResult = await dbGetAll(sql)    
  
  return dbResult[0]
}

const getTotalForwards = async (days) => {  
  const sql = `
  select
    count(1) forwards,
    coalesce(sum(fee),0) fees
  from gui_forwards
  where
    forward_date >= datetime('now','-${days} day')
  `
  const dbResult = await dbGetAll(sql)

  return dbResult[0]
}

const getTotalFailedHTLCs = async (days) => {
  const sql = `
  select
    count(1) failed,
    coalesce(sum(missed_fee),0) failedFees
  from gui_failedhtlcs
  where
    timestamp >= datetime('now','-${days} day')
  `
  const dbResult = await dbGetAll(sql) 

  return dbResult[0]
}

/*
const getTotalOnChainCost = async (days) => {
  const sql = `
  select
    sum(fee) fee
  from gui_onchain
  where
    time_stamp >= datetime('now', '-${days} day')
  `
}
*/