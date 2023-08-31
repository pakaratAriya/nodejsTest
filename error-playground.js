const sum = (a, b) => {
  if (a && b) {
    return a + b;
  }
  throw new Error("Invalid Arguments");
};

try {
  console.log(sum(2, 0));
} catch (err) {
  console.log(err);
}
