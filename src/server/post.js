const fs = require("fs");
const { currentUnixTimestamp } = require("./utilities");
const RedisClient = require("./redis");

module.exports = class Post {
  constructor(postData) {
    let options = postData.options;
    switch (postData.type) {
      case "proposal":
        options = ["For", "Against"];
        break;
      case "issue":
        options = ["Resolved", "Unresolved"];
        break;
      default:
        break;
    }

    this.data = {
      type: postData.type,
      walletAddress: postData.walletAddress,
      title: postData.title,
      imageUrl: `${postData.filename || ""}`,
      description: postData.description,
      options: options,
      createdAt: currentUnixTimestamp(),
      expiresAt: currentUnixTimestamp() + parseInt(this.duration) * 24 * 3600,
      tags: postData.tags,
      votes: postData.votes?.map((vote) => parseInt(vote)),
      quorum: postData.quorum,
    };
  }

  async save() {
    this.data.id = await RedisClient.getNewId(RedisClient.POSTS_DB);
    await RedisClient.jsonset(RedisClient.POSTS_DB, this.data.id, this.data);

    // // read votes file first
    // fs.readFile("./data/votes.json", (err, fileContent) => {
    //   let newVotes = [];
    //   if (!err) {
    //     newVotes = JSON.parse(fileContent);
    //   }

    //   let maxId = 0;
    //   for (let i = 0; i < newVotes.length; i++) {
    //     if (newVotes[i].id > maxId) {
    //       maxId = newVotes[i].id;
    //     }
    //   }
    //   newID = maxId + 1;
    //   this.id = newID;

    //   let newPostData = {};

    //   newPostData.id = newID;
    //   newPostData.user = this.user;

    //   const postDuration = parseInt(this.duration) * 24;

    //   newPostData.expires = addHoursToUTC(this.date, postDuration);
    //   newPostData.votes = this.votes;
    //   newPostData.voted = false;

    //   newVotes.push(newPostData);

    //   // save votes file first
    //   fs.writeFile("./data/votes.json", JSON.stringify(newVotes), (err) => {
    //     console.log(err);
    //   });

    //   // create the comments file
    //   fs.writeFile("./data/comments/#" + this.id + ".json", "[]", (err) => {
    //     console.log(err);
    //   });

    //   // save the rest of the important data from user, this will never change
    //   fs.readFile(`./data/posts.json`, (err, fileContent) => {
    //     let userFile = {};
    //     if (!err) {
    //       userFile = JSON.parse(fileContent);
    //     }

    //     let newEntry = this;
    //     delete newEntry["votes"];

    //     userFile.push(newEntry);

    //     fs.writeFile(`./data/posts.json`, JSON.stringify(userFile), (err) => {
    //       console.log(err);
    //     });
    //   });
    // });
  }
};