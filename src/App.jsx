import React, { useState } from 'react';

function App() {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [tableName, setTableName] = useState('my_table');
  const [columnMapping, setColumnMapping] = useState({});
  const [selectedColumns, setSelectedColumns] = useState({});
  const [sqlOutput, setSqlOutput] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (file) => {
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        parseCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    // Auto-detect separator (comma or semicolon)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const separator = semicolonCount > commaCount ? ';' : ',';

    const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === headers.length) {
        data.push(values);
      }
    }

    setHeaders(headers);
    setCsvData(data);

    const initialMapping = {};
    const initialSelection = {};
    headers.forEach(header => {
      initialMapping[header] = header.toLowerCase().replace(/\s+/g, '_');
      initialSelection[header] = true;
    });
    setColumnMapping(initialMapping);
    setSelectedColumns(initialSelection);
    setSqlOutput('');
  };

  const handleColumnNameChange = (originalName, newName) => {
    setColumnMapping(prev => ({
      ...prev,
      [originalName]: newName
    }));
  };

  const handleColumnToggle = (columnName) => {
    setSelectedColumns(prev => ({
      ...prev,
      [columnName]: !prev[columnName]
    }));
  };

  const generateSQL = () => {
    if (csvData.length === 0) return;

    const selectedHeaderIndexes = headers
      .map((header, index) => selectedColumns[header] ? index : -1)
      .filter(index => index !== -1);

    const selectedHeaderNames = headers.filter(header => selectedColumns[header]);
    const mappedColumnNames = selectedHeaderNames.map(header => columnMapping[header]);

    let sql = '';
    csvData.forEach(row => {
      const values = selectedHeaderIndexes.map(index => {
        const value = row[index];
        if (value === '' || value === null || value === undefined) {
          return 'NULL';
        }
        if (!isNaN(value) && value.trim() !== '') {
          return value;
        }
        return `'${value.replace(/'/g, "''")}'`;
      });

      sql += `INSERT INTO ${tableName} (${mappedColumnNames.join(', ')}) VALUES (${values.join(', ')});\n`;
    });

    setSqlOutput(sql);
  };

  const downloadSQL = () => {
    const blob = new Blob([sqlOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_insert.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = Object.values(selectedColumns).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            CSV to SQL Converter
          </h1>
          <p className="text-gray-600">
            Transform your CSV data into executable SQL INSERT statements
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Upload Zone */}
          <div
            className="mb-8"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}>
              <div className="flex flex-col items-center justify-center">
                <div className={`text-6xl mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'
                  }`}>📁</div>
                <p className="text-sm text-gray-700 font-medium mb-1">
                  Drop your CSV file here or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Supports .csv files only
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>

          {/* Table Name Input */}
          {headers.length > 0 && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Name
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="my_table"
              />
            </div>
          )}

          {/* Column Configuration */}
          {headers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Column Mapping
                </h2>
                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
                  {selectedCount} of {headers.length} selected
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200">
                <div className="space-y-3">
                  {headers.map((header, index) => (
                    <div
                      key={index}
                      className="bg-white p-4 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedColumns[header] || false}
                          onChange={() => handleColumnToggle(header)}
                          className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                              CSV Column
                            </label>
                            <div className="text-sm font-medium text-gray-900">{header}</div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                              SQL Column
                            </label>
                            <input
                              type="text"
                              value={columnMapping[header] || ''}
                              onChange={(e) => handleColumnNameChange(header, e.target.value)}
                              disabled={!selectedColumns[header]}
                              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generate Button */}
          {headers.length > 0 && (
            <div className="mb-8">
              <button
                onClick={generateSQL}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                Generate SQL
              </button>
            </div>
          )}

          {/* SQL Output */}
          {sqlOutput && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  SQL Output
                </h2>
                <button
                  onClick={downloadSQL}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>💾</span>
                  Download SQL
                </button>
              </div>
              <textarea
                value={sqlOutput}
                readOnly
                className="w-full h-80 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm bg-gray-50 focus:outline-none resize-none"
              />
              <div className="mt-3 text-sm text-gray-600">
                Successfully converted {csvData.length} rows
              </div>
            </div>
          )}

          {/* Empty State */}
          {headers.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <div className="text-7xl mb-4">📄</div>
              <p className="text-sm">
                Upload a CSV file to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

}

export default App
