const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = 'my_verify_token'; // Replace with your verify token

app.use(bodyParser.json());

// Webhook Verification Endpoint
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("Webhook verified.");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Webhook Event Receiver
app.post('/webhook', (req, res) => {
    console.log('Received Webhook:', JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const leadgenId = changes?.value?.leadgen_id;

    if (!leadgenId) {
        return res.sendStatus(400);
    }

    const lead = {
        time: new Date().toISOString(),
        page_id: changes.value.page_id,
        form_id: changes.value.form_id,
        leadgen_id: leadgenId
        // Add more data here if needed
    };

    // Store in Excel
    storeLeadToExcel(lead);

    // Send email
    sendEmailToClient(lead, 'client@example.com'); // Change recipient

    res.sendStatus(200);
});

// Save Lead to Excel File
function storeLeadToExcel(lead) {
    const file = 'leads.xlsx';
    let workbook;
    try {
        workbook = XLSX.readFile(file);
    } catch {
        workbook = XLSX.utils.book_new();
    }

    const sheetName = 'Leads';
    let data = [];

    if (workbook.Sheets[sheetName]) {
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    data.push(lead);
    const newSheet = XLSX.utils.json_to_sheet(data);
    workbook.Sheets[sheetName] = newSheet;
    XLSX.writeFile(workbook, file);

    console.log("Lead stored to Excel.");
}

// Email Notification
function sendEmailToClient(lead, recipient) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'your.email@gmail.com',      // <-- replace with your email
            pass: 'your_app_password'          // <-- use App Password if using Gmail
        }
    });

    const mailOptions = {
        from: 'your.email@gmail.com',
        to: recipient,
        subject: 'New Facebook Lead Captured',
        text: `A new lead has been captured:\n\n${JSON.stringify(lead, null, 2)}`
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending mail:', err);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
