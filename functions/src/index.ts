import * as functions from "firebase-functions";
// Require the Node Slack SDK package (github.com/slackapi/node-slack-sdk)
const { WebClient, LogLevel } = require("@slack/web-api");

// WebClient insantiates a client that can call API methods
// When using Bolt, you can use either `app.client` or the `client` passed to listeners.
const client = new WebClient(functions.config().slack.key, {
  // LogLevel can be imported and used to make debugging simpler
  logLevel: LogLevel.DEBUG
});

const nlp = require('compromise');
nlp.extend(require('compromise-sentences'));

const isSubjectPronoun = (subject: string) => {
    switch (subject.toLowerCase()) {
        case 'i':
            return true;
        case 'you':
            return true;
        case 'we':
            return true;
        case 'he':
            return true;
        case 'she':
            return true;
        case 'they':
            return true;
        default:
            return false;
    }
}

const capitalizeFirstLetter = (word: string) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

const cleanPhrase = (subject: string, object: string, verb: string) => {
    return `${capitalizeFirstLetter(subject.trim())}, ${object.trim()} ${verb.trim()}`
}

const getYodifiedMessage = (originalMessage: string) => {
    const message = originalMessage.toLowerCase();
    console.log(message);
    const subject = nlp(message).sentences().subjects().text();

    const verb = nlp(message).verbs().text();

    const object = message
        .replace(RegExp(`\\b(${verb})\\b`), '')
        .replace(RegExp(`\\b(${subject})\\b`), '');

    if (isSubjectPronoun(subject)) {
      if(object.trim() === '' || !object) {
        return 'Not well, I was coded';
      }
        return cleanPhrase(object, subject, verb);
    } else {
        return cleanPhrase(subject, object, verb);
    }
};

export const yodifyMessage = functions.https.onRequest(async (req, res) => {
  try {
    let removedAt = req.body.text.replace('@', '');
    let removedComma = removedAt.replace(',', '');
    //split into sentences
    let sentencesArray = removedComma.split('?').join('.').split('!').join('.').split('.');
    let text = '';
    sentencesArray.forEach((sentence: string) => {
      text += getYodifiedMessage(sentence) + '. ';
    });
    // Call the chat.postMessage method using the WebClient
    await client.chat.postMessage({
      channel: `${req.body.channel_id}`,
      text: `${text}`,
    });
  
    res.status(200).send();
  }
  catch (error) {
    console.log(error)
    res.status(400).send();
  }
});