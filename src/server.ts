import express from "express";

const app = express()

app.use('/static', express.static('static'));

app.get('/', (req, res) => {
    res.send('Hello World!!')
})

const port = 3000
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})