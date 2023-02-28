const { google } = require('googleapis');
const sheets = google.sheets('v4');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Authenticate the user
async function authenticate() {
    const auth = new google.auth.GoogleAuth({
        scopes: SCOPES
    });
    return authToken = await auth.getClient();
}

// Get cell values in a range
async function getCellValues({ spreadsheetId, auth, range }) {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
            auth
        });
        return res
    } catch (error) {
        console.log(`Error getting sheet values: ${error.message}`);
    }

}

//Update the cell values in a range
async function updateCellValues({ spreadsheetId, range, valueInputOption, _values, auth }) {
    try {
        let values = _values;
        const res = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption,
            resource: { values },
            auth
        });
        console.log('%d cells updated.', res.data.updatedCells);
        return res;
    } catch (error) {
        console.log(`Error updating sheet values: ${error.message}`);
    }

}

// Get the spreadsheet metadata
async function getSheet({ spreadsheetId, auth }) {
    try {
        const res = await sheets.spreadsheets.get({
            spreadsheetId,
            auth,
        });
        return res;
    } catch (error) {
        console.log(`Error getting sheet metadata: ${error.message}`);
    }
}


async function addSheet({ spreadsheetId, auth, title }) {

    const requests = [];
    requests.push({
        'addSheet': {
            'properties': {
                title
            }
        }
    })
    const batchUpdateRequests = { requests };
    const res = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: batchUpdateRequests,
        auth
    });

    console.log('New sheet created');
    return res;

}

module.exports = {
    authenticate,
    getSheet,
    getCellValues,
    updateCellValues,
    addSheet
};

