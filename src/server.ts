import express from "express";
import * as assert from "assert";
import { v4 as uuid } from "uuid";

const app = express();

app.use('/static', express.static('static'));

// maybe upgrade to Helmet? https://helmetjs.github.io/
app.use(function(req, res, next) {
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    res.setHeader("Strict-Transport-Security", "max-age=60");
    return next();
});

interface Election {
    id: string;
    candidates: { [id: string]: Candidate };
}

interface Candidate {
    id: string;
    rating: number;
    name: string;
    details: { [id: string]: string }
}

let elections: { [id: string]: Election } = {};

app.get('/', (req, res) => {
    // res.send('Hello World!!');
    res.redirect('/static/index.html');
})

// FIXME: this "app" is really just one big XSS vulnerability right now

app.use(express.urlencoded({ extended: true }));

const DEFAULT_RATING = 1000;

function splitLines(t: string) { return t.split(/\r\n|\r|\n/); }

app.post('/election', (req, res) => {
    assert.strictEqual(typeof req.body.candidates, "string");

    let candidates: { [id: string]: Candidate } = {}

    // todo check typeof req.body.candidates == string with assert?
    for (let line of splitLines(req.body.candidates)) {
        let c: Candidate = {
            id: uuid(),
            name: line,
            rating: DEFAULT_RATING,
            details: {},
        }
        candidates[c.id] = c;
    }

    let newElxn: Election = {
        id: uuid(),
        candidates,
    }
    elections[newElxn.id] = newElxn;
    res.redirect(`/election/${newElxn.id}`);
});

app.get('/election/:id', (req, res) => {
    let id: string = req.params.id;
    if (id in elections) {
        let elxn = elections[id];
        let sortedCandidates = Object.values(elxn.candidates).sort((a, b) => {
            return b.rating - a.rating;
        })
        let response = sortedCandidates.map((candidate: Candidate) => {
            return {
                [candidate.name]: candidate.rating,
            }
        });
        res.send(response);
    } else {
        res.sendStatus(404);
    }
});

app.get('/election/:id/vote', (req, res) => {
    let id: string = req.params.id;
    if (id in elections) {
        let elxn = elections[id];
        // pick two TODO: without replacement
        let items = Object.keys(elxn.candidates);
        let p1 = items[Math.floor(Math.random() * items.length)];
        let p2 = items[Math.floor(Math.random() * items.length)];
        let c1: Candidate = elxn.candidates[p1];
        let c2: Candidate = elxn.candidates[p2];
        res.send(`
<form method="post" action="/election/${id}/vote">
    Name: ${c1.name}
    <input name="winner" value="${p1}" type="hidden">
    <input name="loser" value="${p2}" type="hidden">
    <input type="submit" value="Vote">
</form>

<form method="post" action="/election/${id}/vote">
    Name: ${c2.name}
    <input name="winner" value="${p2}" type="hidden">
    <input name="loser" value="${p1}" type="hidden">
    <input type="submit" value="Vote">
</form>
`);
        res.send(`<a href="/election/${4}/vote/${4}">Vote 1</a>`);
        // res.send([c1, c1]);
    } else {
        res.sendStatus(404);
    }
});

app.post('/election/:id/vote', (req, res) => {
    let electionId = req.params.id;
    let winnerId = req.body.winner;
    let loserId = req.body.loser;
    assert.strictEqual(typeof electionId, "string");
    assert.strictEqual(typeof winnerId, "string");
    assert.strictEqual(typeof loserId, "string");

    let winner = elections[electionId].candidates[winnerId];
    let loser = elections[electionId].candidates[loserId];
    // TODO: implement proper Elo rating transform here
    winner.rating += 10;
    loser.rating -= 10;
    res.redirect(`/election/${electionId}/vote`);

    // console.log(req.params);
});


const port = 3000;
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})