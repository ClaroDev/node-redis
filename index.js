const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');
const cors = require('cors');
var removeDiacritics = require('diacritics').remove;

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.PORT || 6379;

const client = redis.createClient(REDIS_PORT);

const app = express();
app.use(cors())

var map = new Map();



// Set Response
function setResponse(countryName, data) {
    return JSON.stringify(data);

//has ${data.population} habitants, the capital is ${data.capital} and is at ${data.weather}º!

}

//Request to api
async function getPopulation(req, res) {
    try {
        const { countryName } = req.params;
        console.log(`Fetching Data for ${countryName}...`);


        const response = await fetch(`https://restcountries.eu/rest/v2/name/${countryName}`);
    
        const data = await response.json();

        const capital = data[0].capital;
        const population = data[0].population;
        const weather = await getWeather(capital);
        const flag = data[0].flag;



        map.set(countryName, {'capital': capital, 'population': population, 'weather': weather, 'flag': flag})

        // Set data to Redis
        client.setex(countryName, 60, JSON.stringify(map.get(countryName)));

       // const currentWeather = await getWeather(capital);
        res.setHeader('Content-Type', 'application/json');
        res.send(setResponse(countryName, map.get(countryName)));

    } catch (err) {
        console.error(err);
        res.status(500);   
    }
}

//Request to weather api
async function getWeather(capital) {
    try {
        capitalRemoveDiacritics = removeDiacritics(capital);
        console.log(`Fetching Weather for ${capital}...`);
        var responseWeather = await fetch(`http://api.weatherstack.com/current?access_key=3a437c431d29ed9cbb2cc68388bce31e&query=${capitalRemoveDiacritics}`);
        const weather = await responseWeather.json();
        return weather.current.temperature;
         
    } catch (err) {
        console.error(err);
        res.status(500);   
    }
}


// Cache middleware
function cache(req, res, next) {
    const {countryName} = req.params;
        client.get(countryName, (err, data) => {
        if(err) throw err;
        if(data !== null) {
                res.send(setResponse(countryName, JSON.parse(data)));
        } else
        next();
    })
}

app.get('/country/:countryName',cache, getPopulation);

app.listen(5000, () => {
    console.log(`App listening on port ${PORT}`);
});



