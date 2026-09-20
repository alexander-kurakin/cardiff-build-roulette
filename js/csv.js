function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (insideQuotes) {
            if (char === '"' && nextChar === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                insideQuotes = false;
            } else {
                field += char;
            }

            continue;
        }

        if (char === '"') {
            insideQuotes = true;
        } else if (char === ',') {
            row.push(field);
            field = "";
        } else if (char === '\r') {
            continue;
        } else if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter(cells => cells.some(cell => cell.trim().length > 0));
}

function csvRowsToObjects(rows) {
    const [header, ...dataRows] = rows;

    return dataRows.map(cells => {
        const record = {};

        header.forEach((columnName, index) => {
            record[columnName.trim()] = (cells[index] ?? "").trim();
        });

        return record;
    });
}
