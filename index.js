import dotenv from 'dotenv'
dotenv.config()

import inquirer from 'inquirer'

import { 
  customersWhoSpendTheMost,
  biggestCustomerWithDestinations,
  destinationGenerateMostFees,
  last24HoursForwards,
  lostRoutings,
  getBigGuys,
  lastChannelForward,
  whoMyCustomerRefuel
 } from './commands/index.js'

let tables = []

const choices = [
  {question: new inquirer.Separator('Control Panel')},
  {question: 'How the node workflow looks like', call: last24HoursForwards },
  {question: 'Last channel forward', call: lastChannelForward },
  {question: 'Take a look at the channels as they may need intervention', call: lostRoutings, params: [{answer:'howManyHours', default: process.env.DEFAULT_HOURS}] },
  {question: new inquirer.Separator('Business Intelligence')},
  {question: 'Customer who spend more and who are their most desired destinations', call: biggestCustomerWithDestinations, params: [{answer:'howManyDays', default: process.env.DEFAULT_DAYS}, {answer:'topCustomers', default: process.env.TOP_CUSTOMERS}, {answer:'topDestinations', default: process.env.TOP_DESTINATIONS}]},
  {question: 'Customers who spend the most', call: customersWhoSpendTheMost, params: [{answer:'howManyDays', default: process.env.DEFAULT_DAYS}]},
  {question: 'Destinations that generate the most fees', call: destinationGenerateMostFees, params: [{answer:'howManyDays', default: process.env.DEFAULT_DAYS}]},
  {question: 'Want to route large transactions? Look at these guys!', call: getBigGuys, params: [{answer:'howManyDays', default: process.env.DEFAULT_DAYS}, {answer:'minSats', default: process.env.MIN_SATS}]},
  {question: 'Who my customers refuel', call: whoMyCustomerRefuel, params:[{answer: 'howManyDays', default: process.env.DEFAULT_DAYS}]}
]    

const defaultMinSats = Number(process.env.MIN_SATS)


const questions = [
  {
    type: 'rawlist',
    name: 'queries',
    message:'What do you want to list?',
    choices: choices.map(choice => choice.question)
  },
  {  
    name: 'howManyDays',
    message:`With how many days (default ${process.env.DEFAULT_DAYS})?`, 
    when: (answers) => getSubQuestions(choices, 'howManyDays', answers.queries)
  },
  {  
    name: 'howManyHours',
    message:`With how many hours (default ${process.env.DEFAULT_HOURS})?`, 
    when: (answers) => getSubQuestions(choices, 'howManyHours', answers.queries)
  },
  {  
    name: 'topCustomers',
    message:`With how many customers (default ${process.env.TOP_CUSTOMERS})?`, 
    when: (answers) => getSubQuestions(choices, 'topCustomers', answers.queries)
  },
  {  
    name: 'topDestinations',
    message:`With how many destinations each (default ${process.env.TOP_DESTINATIONS})?`, 
    when: (answers) => getSubQuestions(choices, 'topDestinations', answers.queries)
  },
  {  
    name: 'minSats',
    message:`With how many sats at least (default ${defaultMinSats.toLocaleString()})?`, 
    when: (answers) => getSubQuestions(choices, 'minSats', answers.queries)
  },
  {  
    type: 'confirm',
    name: 'keepAsking',
    message:`Are you done?`,    
  }
]

  getAnswers().then().catch((error) => {console.log(error)})


async function getAnswers() {
  return inquirer.prompt(questions)
  .then(async answers => {                 
    const choice = choices.find(choice => choice.question === answers.queries)

    if (!choice) {
      return console.log('invalid option')
    }
    
    const params = []

    if (choice.params) {
      choice.params.forEach(param => {
        params.push(answers[param.answer] || param.default)
      })    
    }
    
    const table = await choice.call(...params)
    
    if (table && table.length > 0) {
      tables.push(table)
    }

    if (answers.keepAsking) {
      tables.forEach(table => console.log(table))
    } else {      
      return getAnswers()
    }
  })
}

const getSubQuestions = (choices, newQuestion, answer) => {
  const choicesWithParams = choices.filter(choice => choice.params)
  return choicesWithParams.filter(choice => choice.params.find(param => param.answer === newQuestion)).map(choice => choice.question).includes(answer)
}