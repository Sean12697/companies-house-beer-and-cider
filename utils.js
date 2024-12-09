const fs = require('fs-extra');

/**
 * Format the Markdown content with a table of contents and structured activity section.
 * @param {Array} companies - List of companies from the Companies House API.
 * @param {Array} descriptions - SIC descriptions from the JSON file.
 * @returns {string} - The formatted Markdown content.
 */
function formatMarkdown(companies, descriptions) {
    const companiesByStatus = {};
    const companiesByIndustry = {};
    const activitiesByDate = {};

    // Process companies for status and industry sections
    companies.forEach((company) => {
        const status = company.company_status || 'unknown';
        const sicCode = company.sic_codes[0];
        const industry = descriptions.find((d) => d['SIC Code'] === Number(sicCode))?.Description || 'Unknown Industry';

        // Organize by status
        if (!companiesByStatus[status]) companiesByStatus[status] = [];
        companiesByStatus[status].push(company);

        // Organize by industry
        if (!companiesByIndustry[industry]) companiesByIndustry[industry] = [];
        companiesByIndustry[industry].push(company);

        // Organize by date for activities
        const filings = company.filling_history || [];
        filings.forEach((filing) => {
            const date = new Date(filing.date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1; // Months are zero-indexed

            if (!activitiesByDate[year]) activitiesByDate[year] = {};
            if (!activitiesByDate[year][month]) activitiesByDate[year][month] = [];

            activitiesByDate[year][month].push({
                id: filing.transaction_id,
                company_name: company.company_name,
                company_number: company.company_number,
                description: filing.description,
                category: filing.category,
                subcategory: filing.subcategory,
                day: date.getDate(),
            });
        });
    });

    // Generate Markdown content
    let markdown = '# Companies House: Beer & Cider Updates\n\n## TABLE OF CONTENTS\n\n';
    const toc = [];

    // Activities Section
    markdown += '## Activities\n\n';
    toc.push('- [Activities](#activities)');
    Object.keys(activitiesByDate)
        .sort((a, b) => b - a) // Sort years descending
        .forEach((year) => {
            markdown += `### ${year}\n\n`;
            toc.push(`  - [${year}](#${year.toLowerCase()})`);
            Object.keys(activitiesByDate[year])
                .sort((a, b) => b - a) // Sort months descending
                .forEach((month) => {
                    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' }) + ", " + year;
                    markdown += `#### ${monthName}\n\n`;
                    toc.push(`    - [${monthName}](#${monthName.toLowerCase().replace(/\s/g, '-').replace(',', '')})`);
                    activitiesByDate[year][month].sort((a, b) => b.day - a.day).forEach((activity) => {
                        const day = `${activity.day}${ordinalSuffix(activity.day)}`;
                        markdown += `- ${day} - [${activity.company_name}](https://find-and-update.company-information.service.gov.uk/company/${activity.company_number}): [${activity.description}](https://find-and-update.company-information.service.gov.uk/company/09611653/filing-history/${activity.id}) (${activity.category}${activity.subcategory ? " > " + activity.subcategory : "" })\n`;
                    });
                    markdown += '\n';
                });
        });

    // Companies by Status Section
    markdown += '## Companies\n\n### Status\n\n';
    toc.push('- [Companies](#companies)', '  - [Status](#status)');
    Object.keys(companiesByStatus).forEach((status) => {
        markdown += `#### ${status.charAt(0).toUpperCase() + status.slice(1)}\n\nTotal: ${companiesByStatus[status].length}\n\n`;
        toc.push(`    - [${status}](#${status.toLowerCase()})`);
        companiesByStatus[status].forEach((company) => {
            markdown += `- [${company.company_name}](https://find-and-update.company-information.service.gov.uk/company/${company.company_number})\n`;
        });
        markdown += '\n';
    });

    // Companies by Industry Section
    markdown += '### Industry\n\n';
    toc.push('  - [Industry](#industry)');
    Object.keys(companiesByIndustry).forEach((industry) => {
        markdown += `#### ${industry}\n\nTotal: ${companiesByIndustry[industry].length}\n\n`;
        toc.push(`    - [${industry}](#${industry.toLowerCase().replace(/\s/g, '-')})`);
        companiesByIndustry[industry].forEach((company) => {
            markdown += `- [${company.company_name}](https://find-and-update.company-information.service.gov.uk/company/${company.company_number})\n`;
        });
        markdown += '\n';
    });

    // Add Table of Contents
    markdown = markdown.replace('## TABLE OF CONTENTS\n\n', `## TABLE OF CONTENTS\n\n${toc.join('\n')}\n\n`);
    return markdown;
}

/**
 * Append an ordinal suffix to a date (e.g., 1st, 2nd, 3rd, etc.).
 * @param {number} day - Day of the month.
 * @returns {string} - Day with ordinal suffix.
 */
function ordinalSuffix(day) {
    const j = day % 10, k = day % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

/**
 * Fetch SIC descriptions from the JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Promise<Array>} - The SIC descriptions.
 */
async function fetchSICDescriptions(filePath) {
    try {
        return await fs.readJson(filePath);
    } catch (error) {
        console.error('Error reading SIC descriptions:', error.message);
        return [];
    }
}

module.exports = { formatMarkdown, fetchSICDescriptions };
