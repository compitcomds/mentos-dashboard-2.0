const generateRandomHandle = (length = 12) => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  // Ensure it starts with a letter if the first char is a number and length > 0
  if (result.length > 0 && !/^[a-z]/.test(result)) {
    result = "h" + result.substring(1);
  } else if (result.length === 0 && length > 0) {
    // Handle case where length is 0 (though unlikely with default 12)
    result =
      "h" +
      Array(length - 1)
        .fill(0)
        .map(() =>
          characters.charAt(Math.floor(Math.random() * characters.length))
        )
        .join("");
  }
  return result;
};

export default generateRandomHandle;
