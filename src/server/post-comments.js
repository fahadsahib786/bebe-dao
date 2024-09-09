const { shorthandAddress } = require("./utilities");
const RedisClient = require("./redis");

module.exports = class PostComments {
  static async findByCommentsPostId(postId) {
    let comments =
      (await RedisClient.jsonget(RedisClient.COMMENTS_DB, postId)) || [];

    for (let index = 0; index < comments.length; index++) {
      comments[index] = await this.mergeCommentAddress(comments[index]);
      for (let index2 = 0; index2 < comments[index].replies.length; index2++) {
        comments[index].replies[index2] = await this.mergeCommentAddress(
          comments[index].replies[index2]
        );
      }
    }

    return comments.reverse();
  }

  static async mergeCommentAddress(comment) {
    const address = await RedisClient.jsonget(
      RedisClient.ADDRESSES_DB,
      comment.walletAddress
    );

    comment.username =
      address.username || shorthandAddress(comment.walletAddress);
    comment.avatarUrl = address.avatarUrl;

    return comment;
  }
};