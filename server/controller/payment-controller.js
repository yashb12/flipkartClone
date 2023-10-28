import paytmchecksum from '../paytm/PaytmChecksum.js';
import { paytmParams, paytmMerchantkey } from '../server.js';
import formidable from 'formidable';
import https from 'https';

export const addPaymentGateway = async (request, response) => {
    try {
        const paytmCheckSum = await paytmchecksum.generateSignature(paytmParams, paytmMerchantkey);
        const params = {
            ...paytmParams,
            CHECKSUMHASH: paytmCheckSum
        };
        response.json(params);
    } catch (error) {
        console.error('Error generating Paytm checksum:', error);
        response.status(500).json({ error: 'Internal server error' });
    }
};

export const paymentResponse = (request, response) => {
    const form = formidable({ multiples: true });

    form.parse(request, (err, fields) => {
        if (err) {
            console.error('Error parsing form data:', err);
            response.status(400).json({ error: 'Bad request' });
            return;
        }

        const paytmCheckSum = fields.CHECKSUMHASH;
        delete fields.CHECKSUMHASH;

        const isVerifySignature = paytmchecksum.verifySignature(fields, 'bKMfNxPPf_QdZppa', paytmCheckSum);
        if (isVerifySignature) {
            let paytmParams = {
                MID: fields.MID,
                ORDERID: fields.ORDERID
            };

            paytmchecksum.generateSignature(paytmParams, 'bKMfNxPPf_QdZppa').then((checksum) => {
                paytmParams.CHECKSUMHASH = checksum;

                const post_data = JSON.stringify(paytmParams);

                const options = {
                    hostname: 'securegw-stage.paytm.in',
                    port: 443,
                    path: '/order/status',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(post_data)
                    }
                };

                let res = '';
                const post_req = https.request(options, (post_res) => {
                    post_res.on('data', (chunk) => {
                        res += chunk;
                    });

                    post_res.on('end', () => {
                        let result = JSON.parse(res);
                        console.log(result);
                        response.redirect('');
                    });
                });

                post_req.write(post_data);
                post_req.end();
            });
        } else {
            console.log('Checksum Mismatched');
            response.status(400).json({ error: 'Checksum mismatch' });
        }
    });
};
