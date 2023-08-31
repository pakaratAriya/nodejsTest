const deleteProduct = (btn) => {
  const prodId = btn.parentNode.querySelector("[name=productId]").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value;
  const parentElement = btn.closest("article");
  fetch("/admin/product/" + prodId, {
    headers: {
      "csrf-token": csrf,
    },
    method: "DELETE",
  })
    .then((result) => {
      return result.json();
    })
    .then((data) => {
      console.log(data);
      parentElement.parentNode.removeChild(parentElement);
    })
    .catch((err) => {
      console.log(err);
    });
};
