import { $, $$ } from "/js/selectors.js";
import { checkFileProperties, handleUploadedFile } from "/js/image-select.js";

let link = undefined;
let session = undefined;
export let features = localStorage.getItem("features") || null;

export let user;
export const admins = ["lucianape3"];
export let minBalance = 0;
export let membership = true; // default should be false
export let accountStatus;

export const url = "http://" + location.hostname + ":9632/";

export let avatarbase64;

const loginButton = $("#login");
const avatarName = $("#avatar-name");
const logoutButton = $("#logout");

// for checking and saving membership and balance and other info
export const addressInfo = (user, authenticating) => {
  fetch(url + "address-info?user=" + user + "&login=" + authenticating, {})
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      accountStatus = data;

      if (data.balance >= minBalance && data.kyc === true) {
        membership = true;
      }
      if (user) {
        $("#user-menu .avatar").src = `/avatars/${user}.webp`;
        $("#balance b").innerHTML = data.balance + " BEBE";
        $("#login span").textContent = "Switch wallet";
        $("#logout").style.display = "block";
      } else {
        $("#user-menu .avatar").src = `/svgs/user.svg`;
      }

      return accountStatus.members;
    });
};

$("#close-features").addEventListener("click", (e) => {
  localStorage.setItem("features", "hidden");
  $(".features").style.display = "none";
});

// Login in function that is called when the login button is clicked
export const login = async () => {
  wallets.classList.remove("hide");
};

// Logout function sets the link and session back to original state of undefined
const logout = async () => {
  if (link && session) {
    await link.removeSession(appIdentifier, session.auth, chainId);
  }
  session = undefined;
  link = undefined;
  avatarName.textContent = "";
  location.reload();
};

// // Add button listeners
// loginButton.addEventListener("click", e => login(false))
// logoutButton.addEventListener("click", e => logout())

$("#account").addEventListener("click", (e) => {
  $("#profile").style = "display: block !important";
});

$("#profile .modal_close").addEventListener("click", (e) => {
  $("#profile").style = "";
});

$("#profile-form").addEventListener("change", (event) => {
  // check file selected
  let theFile;
  if (event.target.files) {
    theFile = event.target.files[0];
    $("#profile-form .form_error").classList.add("error");
    if (checkFileProperties(theFile, "profile-form")) {
      handleUploadedFile(theFile, "profile-form");
    }
  }
});
