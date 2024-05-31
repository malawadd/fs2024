const express = require('express');
const { exec } = require('child_process');
require('dotenv').config();

const router = express.Router();

router.post('/lilypad', (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        console.log('Prompt is required');
        return res.status(400).send('Prompt is required');
    }

    const command = `lilypad run ollama-pipeline:llama3-8b-lilypad2 -i Prompt='${prompt}' --web3-private-key "${process.env.WEB3_PRIVATE_KEY_LILYPAD}"`;

    console.log('Running command:', command);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing command: ${error.message}`);
            return res.status(500).send(`Error: ${error.message}`);
        }

        if (stderr) {
            console.error(`Command stderr: ${stderr}`);
            return res.status(500).send(`Stderr: ${stderr}`);
        }

        console.log('Command stdout:', stdout);

        const resultDirMatch = stdout.match(/\/tmp\/lilypad\/data\/downloaded-files\/(\w+)/);
        if (resultDirMatch) {
            const resultDir = resultDirMatch[1];
            const resultFilePath = `/tmp/lilypad/data/downloaded-files/${resultDir}/stdout`;

            console.log('Result directory:', resultDir);
            console.log('Result file path:', resultFilePath);

            exec(`cat ${resultFilePath}`, (catError, catStdout, catStderr) => {
                if (catError) {
                    console.error(`Error reading result file: ${catError.message}`);
                    return res.status(500).send(`Error: ${catError.message}`);
                }

                if (catStderr) {
                    console.error(`Cat stderr: ${catStderr}`);
                    return res.status(500).send(`Stderr: ${catStderr}`);
                }

                console.log('Cat stdout:', catStdout);

                try {
                    const response = extractResponse(catStdout);
                    console.log('Extracted response:', response);
                    res.send(response);
                } catch (extractError) {
                    console.error(`Error extracting response: ${extractError.message}`);
                    res.status(500).send(`Error: ${extractError.message}`);
                }
            });
        } else {
            console.log('Result directory not found in output.');
            res.status(500).send('Result directory not found in output.');
        }
    });
});



function extractResponse(catOutput) {
    console.log('Extracting response from cat output');

    let responseMatch = catOutput.match(/'response':\s*'(.*?)',\s*'done':\s*True/s);
    if (!responseMatch) {
        responseMatch = catOutput.match(/'response':\s*"(.*?[^\\])",\s*'done':/s);
    }

    if (!responseMatch) {
        throw new Error('Response not found in output.');
    }

    let response = responseMatch[1];

    response = response.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\/'/g, "'");

    return response;
}



module.exports = router;
