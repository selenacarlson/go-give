const pool = require('./pool');

async function getTopDonors (res) {
    let onetimeTopGivers = [];
    let subscriptionTopGivers = [];

    // const otdSqlText = `SELECT SUM(otd.amount_charged), np.name as nonprofit_name, np.id as nonprofit_id, np.logo_url, users.name as user_name, users.id as user_id
    // FROM onetime_donations as otd JOIN nonprofit as np ON otd.nonprofit_id = np.id
    // JOIN users ON user_id = otd.user_id
    // GROUP BY users.id, users.name, np.name, np.id, np.logo_url 
    // ORDER BY sum LIMIT 10;`;
    const otdSqlText = `SELECT SUM(otd.amount_charged), users.id as user_id, users.name as username, np.id, np.name as nonprofit_name 
    FROM onetime_donations as otd JOIN users ON otd.user_id = users.id 
    JOIN nonprofit as np ON np.id = otd.nonprofit_id WHERE nonprofit_id = 4
    GROUP BY users.id, np.id
    ORDER BY sum DESC LIMIT 10;`
    await pool.query(otdSqlText, [])
        .then(response => {
         
            onetimeTopGivers = response.rows;
        })
        .catch(err => {
            console.log(err);  
            res.sendStatus(500);      
        });

    // const sidSqlText = `SELECT SUM(sid.amount_paid), np.name as nonprofit_name, np.id as nonprofit_id, np.logo_url, users.name as user_name, users.id as user_id
    // FROM invoices as sid JOIN nonprofit as np ON sid.nonprofit_id = np.id
    // JOIN users ON user_id = sid.user_id
    // GROUP BY users.id, users.name, np.name, np.id, np.logo_url 
    // ORDER BY sum LIMIT 10;`;
    const sidSqlText = `SELECT SUM(sid.amount_paid), users.id as user_id, users.name as username, np.id, np.name as nonprofit_name 
    FROM invoices as sid JOIN users ON sid.user_id = users.id 
    JOIN nonprofit as np ON np.id = sid.nonprofit_id WHERE nonprofit_id = 4 
    GROUP BY users.id, np.id
    ORDER BY sum DESC LIMIT 10;`
    await pool.query(sidSqlText, [])
    .then(response => {
        subscriptionTopGivers = response.rows;
    })
    .catch(err => {
        console.log('ERR in sidSqlText POOL.QUERY >>>>>>>>>>>>', err);
        res.sendStatus(500);
    });
    
    // let grandTotalsByUser = getGrandTotalsByUser(onetimeTopGivers, subscriptionTopGivers);
    let topGiversSummary = {
        onetimeTopGivers: onetimeTopGivers,
        subscriptionTopGivers: subscriptionTopGivers,
        grandTotalsByUser: getGrandTotalsByUser(onetimeTopGivers, subscriptionTopGivers)
    };

    res.send(topGiversSummary);

}

function getGrandTotalsByUser (onetimeTopGivers, subscriptionTopGivers) {
    let combined = onetimeTopGivers.concat(subscriptionTopGivers);
    let unsortedTotals = combined.reduce( (a, b) => {
        if(a[b.username]){
            a[b.username].sum += Number(b.sum);
            return a;
        } else {
            a[b.username] = {
                sum: Number(b.sum), 
                username: b.username, 
                nonprofit_name: b.nonprofit_name, 
                id: b.id
            };
            return a;
        }
    }, {});
    return packageTotals (unsortedTotals)
}


function packageTotals (totals) {
    let keys = Object.keys(totals);
    let unsortedTotalsArray = keys.map(key => {
        return {
            username: totals[key].username, 
            sum: totals[key].sum, 
            nonprofit_name: totals[key].nonprofit_name, 
            id: totals[key].id
        };
    });
    // return unsortedTotalsArray;
    return sortTotals (unsortedTotalsArray);
}

function sortTotals (unsorted) {
    return unsorted.sort( (a, b) => {
        return b.sum - a.sum
    });
}

module.exports = getTopDonors;



