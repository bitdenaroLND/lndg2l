import dotenv from 'dotenv'
dotenv.config()
import pkg from 'sqlite3'
const {verbose, Database} = pkg
verbose()
const db = new Database(process.env.DATABASE_FILE)

export async function dbGetAll (sql) {
  return new Promise((resolve, reject) => {    
    db.all(sql, (err, rows) => {      
      if (err) {
        reject(err)
      }
      resolve (rows)      
    })  
  })   
}