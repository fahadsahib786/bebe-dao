const RedisClient = require("./redis.js");
const fs = require("fs");
const { currentUnixTimestamp } = require("./utilities.js");
const path = require("path");

const AVATAR_PREFIX = path.join(
  __dirname,
  "..",
  "..",
  "public_html",
  "images",
  "addresses"
);

const addressInfo = async function (data, avatarUrl = null) {
  let address = await RedisClient.jsonget(
    RedisClient.ADDRESSES_DB,
    data.address
  );

  // Initialize address if it does not exist
  if (!address) {
    address = {
      ...data,
      registeredAt: currentUnixTimestamp(),
    };
  }

  // Handle avatarUrl update and remove the old avatar file if it exists
  if (avatarUrl) {
    const oldAvatarUrl = address.avatarUrl;
    if (oldAvatarUrl) {
      fs.rmSync(path.join(AVATAR_PREFIX, oldAvatarUrl), { force: true });
    }
    address.avatarUrl = avatarUrl;
  }

  // Update address details
  address = {
    ...address,
    ...data,
    lastSessionAt: currentUnixTimestamp(),
  };

  // Remove the `banned` property if it exists and is set to false
  if (address.banned === false) {
    delete address.banned;
  }

  delete address.address; // Remove the `address` key before saving
  await RedisClient.jsonset(RedisClient.ADDRESSES_DB, data.address, address);

  // Retrieve and return the updated address information
  const result = await RedisClient.jsonget(
    RedisClient.ADDRESSES_DB,
    data.address
  );

  return {
    ...result,
    address: data.address,
    // Uncomment if avatar URL should be included in the result
    // avatarPublicUrl: result.avatarUrl ? `${AVATAR_PUBLIC_URL}/${result.avatarUrl}` : null,
  };
};

module.exports.addressInfo = addressInfo;
