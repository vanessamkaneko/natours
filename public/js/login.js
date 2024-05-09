/* eslint-disable*/

const login = async (email, password) => {
  console.log(
    JSON.stringify({
      email,
      password,
    }),
  );

  const res = fetch('/api/v1/users/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })
    .then((r) => {
      r.json().then((res) => {
        if (res.status === 'success') {
          alert('Logged in sucessfully!');
          window.setTimeout(() => {
            location.assign('/');
          }, 1500);
        }
      });
    })
    .catch((err) => {
      alert(err.response.message);
    });
  // const res = await axios({
  //   method: 'POST',
  //   url: 'http://localhost:3000/api/v1/users/login',
  //   data: {
  //     email,
  //     password,
  //   },
  // });
};

document.querySelector('.form').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  login(email, password);
});
