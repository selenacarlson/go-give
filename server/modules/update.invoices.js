const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('./pool');

const updateSubscriptionStatus = require('./ourDB.update.subscription.status');


// Call the first function in the function chain.
// We module.exports this.
function updateInvoicesTableInOurDB (res) {
    // console.log('########$$$$$$$$$@@@@@@@@ res', res);
    
    getUsersFromOurDB(res)
}

// Get all users from the 'users' column of our database (ourDB).
// Loop through the response–an array of users–and if a
// given user's customer_id property evaluates to 'truthy',
// get that user's customer information from Stripe
function getUsersFromOurDB (res) {
    const sqlText = `SELECT * FROM users ORDER BY id;`;
    pool.query(sqlText, [])
    .then(response => {
      console.log(response, 'response in getUsersFromOurDB');
        // console.log('RESPONSE ------ ', response);
        response.rows.forEach(user => {
          if(user.customer_id){
            getStripeCustomerInfoFor(user, res)
          }
        });
    }).catch(err => {
        console.log(err);
    });
}

// For the ourDB user object passed in, ask for their Stripe customer info.
// Then, loop through the 'subscriptions.data' array in
// the response and for each subscription, get all invoices
// Stripe invoices associated with it
function getStripeCustomerInfoFor (user, res) {
  console.log(user, '*******************user in getStripeCustomerInfoFor');
    stripe.customers.retrieve(user.customer_id,
        (err, customer) => {
            if(err){
                console.log(err);
            } else {
                customer.subscriptions.data.forEach(subscription => getInvoicesFor(subscription, res));
            }
        });
}

// For the Stripe subscription object passed in, list all
// Stripe invoices associated with it. Then get the invoice data already
// stored in ourDB and compare them with the invoice data returned
// from Stripe.
function getInvoicesFor (subscription, res) {
    stripe.invoices.list({
        subscription: subscription.id
    },
    (err, invoices) => {
        if(err) {
            console.log(err);
        } else {
            getInvoicesFromDBAndCheckAgainstThese(invoices.data, res)
        }
    })
}


// Compare the IDs of the invoices passed in with those of the invoices
// we have stored in ourDB. If IDs match, update the invoice from ourDB
// with the info from the Stripe invoice (this will keep us current with stripe).
// If there is no match, insert the new Stripe invoice data into ourDB.
function getInvoicesFromDBAndCheckAgainstThese (stripeInvoices, res) {
    const sqlText = `SELECT * FROM invoices;`;
    pool.query(sqlText, [])
    .then(response => {
        if(response.rows[0]){
            let ourInvoiceIds = response.rows.map(invoice => invoice.invoice_id);
            stripeInvoices.forEach(stripeInvoice => {
                if (ourInvoiceIds.indexOf(stripeInvoice.id) != -1) {
                    updateOurDBWith (stripeInvoice, res);
                } else {
                    insertIntoOurDB (stripeInvoice, res)
                }
            });
        } else {
            stripeInvoices.forEach(stripeInvoice => insertIntoOurDB(stripeInvoice, res));
        }
    })
    .catch(err => {
        console.log(err);
    });
}


// Update ourDB with information from the Stripe invoice passed in.
function updateOurDBWith (invoice, res) {    
    const sqlText = `UPDATE invoices SET
            amount_paid=$1,
            last_updated=$2,
            date=$3
        WHERE invoice_id=$4;`;
    pool.query(sqlText, [invoice.amount_paid, new Date(), new Date(invoice.date * 1000), invoice.id])
    .then(response => {
        console.log('SUCCESS on UPDATE invoices');
        getSubscriptionWith(invoice.subscription, res);
    })
    .catch(err => {
        console.log('ERROR on UPDATE invoices');
    });
}

// Insert into ourDB, info from the Stripe invoice passed in
function insertIntoOurDB(invoice, res) {
    const sqlText = `INSERT INTO invoices (
                amount_paid,
                invoice_id,
                product_id,
                charge_id,
                subscription_id,
                plan_id,
                date,
                period_start,
                period_end,
                last_updated,
                user_id,
                nonprofit_id
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                (SELECT id FROM users WHERE customer_id=$11),
                (SELECT id FROM nonprofit WHERE product_id=$12)
            );`;
    pool.query(sqlText, [
        invoice.amount_paid,
        invoice.id,
        invoice.lines.data[0].plan.product,
        invoice.charge,
        invoice.subscription,
        invoice.lines.data[0].plan.id,
        new Date(invoice.date * 1000),
        new Date(invoice.lines.data[0].period.start * 1000),
        new Date(invoice.lines.data[0].period.end * 1000),
        new Date(),
        invoice.customer,
        invoice.lines.data[0].plan.product
    ])
    .then(response => {
        console.log('SUCCESS on INSERT INTO invoices');
        getSubscriptionWith(invoice.subscription, res);
    })
    .catch(err => {
        console.log('ERROR on INSERT INTO invoices', err);
    });
}


function getSubscriptionWith (subscriptionId, res) {
    stripe.subscriptions.retrieve(subscriptionId, 
    (err, subscription) => {
        if(err){
            console.log(err);
        } else {
            updateSubscriptionStatus(subscription, res)
        }
    });
}

module.exports = updateInvoicesTableInOurDB;



// Get the subscription object for each invoice inserted and update subscription status for it