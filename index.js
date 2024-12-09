require('dotenv').config();
const fs = require('fs-extra');
const axios = require('axios');
const { formatMarkdown, fetchSICDescriptions } = require('./utils');

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    console.error('API_KEY is missing in .env file');
    process.exit(1);
}

const BASE_URL = 'https://api.company-information.service.gov.uk';

// Fetch relevant companies
async function fetchCompanies() {
    const url = `${BASE_URL}/advanced-search/companies?location=Manchester&sic_codes=11030,11040,11050,11060&size=5000`;
    try {
        const response = await axios.get(url, {
            headers: { Authorization: API_KEY }
        });
        return response.data.items || [];
    } catch (error) {
        console.error('Error fetching companies:', error.message);
        return [];
    }
}

// Fetch filing history for a company
async function fetchFilingHistory(companyNumber) {
    const url = `${BASE_URL}/company/${companyNumber}/filing-history?items_per_page=5000`;
    try {
        const response = await axios.get(url, {
            headers: { Authorization: API_KEY }
        });
        return response.data.items || [];
    } catch (error) {
        console.error(`Error fetching filing history for ${companyNumber}:`, error.message);
        return [];
    }
}

// Save JSON file for each company
async function saveCompanyData(company) {
    const folder = './companies';
    const fileName = `${folder}/${company.company_name.replace(/[/\\?%*:|"<>]/g, '_')}.json`;

    // Ensure folder exists
    await fs.ensureDir(folder);

    try {
        const filingHistory = await fetchFilingHistory(company.company_number);
        const companyData = { ...company, filling_history: filingHistory };
        await fs.writeJson(fileName, companyData, { spaces: 2 });
        return companyData;
    } catch (error) {
        console.error(`Error saving company data for ${company.company_name}:`, error.message);
    }
}

// Generate README.md
async function generateReport(companies) {
    const descriptions = await fetchSICDescriptions('./SIC07_CH_condensed_list_en.json');
    const markdown = formatMarkdown(companies, descriptions);
    await fs.writeFile('./README.md', markdown);
    console.log('README.md generated successfully.');
}

// Main function
(async () => {
    let companies = await fetchCompanies();
    for (let i = 0; i < companies.length; i++) companies[i] = await saveCompanyData(companies[i]);
    await generateReport(companies);
})();
