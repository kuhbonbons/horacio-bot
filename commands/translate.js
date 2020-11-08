const fetch = require('node-fetch');
const btoa = require('btoa');
const ISO6391 = require('iso-639-1');
const UserError = require('../UserError');
const { translateLimit } = require('../config');

const { WATSON_KEY } = process.env;

const isValidLang = (langArg) => langArg.split('-').every((lang) => ISO6391.validate(lang));

module.exports = {
  name: 'translate',
  description: 'Vote for pinning a message',
  hasArgs: () => true,
  get usage() {
    return `\`\`\`
> quote to translate
!translate <lang>

OR

!translate <sentence> <lang>
\`\`\`
    `;
  },
  async execute(message, { args, quote }) {
    const lang = args.pop();
    if (!lang.match(/^[a-zA-z]{2}-[a-zA-z]{2}$/)) throw new UserError('language argument is not valid');
    if (!isValidLang(lang)) throw new UserError('one of the languages provided is not valid');
    let text;
    if (quote) {
      if (args.length) throw new UserError(`too many arguments provided${this.usage}`);
      text = quote;
    } else {
      if (!args.length) throw new UserError(`not enough arguments provided${this.usage}`);
      text = args.join(' ');
    }

    if (text.length > translateLimit) throw new UserError(`sentence too long. Max length is ${translateLimit} characters`);

    const auth = btoa(`apikey:${WATSON_KEY}`);
    const response = await fetch('https://api.eu-de.language-translator.watson.cloud.ibm.com/instances/a769df51-3081-4acb-94f4-c80c182418a1/v3/translate?version=2018-05-01', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: lang,
      }),
    });

    if (!response.ok) throw new Error(response.statusText);

    const { translations } = await response.json();
    const [{ translation }] = translations;
    if (translation) {
      message.channel.send(translation);
    } else {
      throw new UserError('no translation found');
    }
  },
};