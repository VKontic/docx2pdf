const spinner = document.getElementById("spinner");
const inputFile = document.querySelector("#file");
const btnDownload = document.querySelector('.btnDownloadPDF');
const conversionsNumber = document.querySelector('header span');
const btnSendMail = document.querySelector('.btnSendMail');
const inputMail = document.querySelector('.inputEmail');
const mailSection = document.querySelector('.sendMailSection');

document.querySelector('.btnClosePurchaseModal').addEventListener('click', closeModalWindow);
btnSendMail.addEventListener('click', sendMail);

var url = ""; // need this as global variable because it will be updated in event hendler function later
var fileName = "";

inputFile.addEventListener('change', () => {
    btnDownload.classList.remove('btnDownloadActive');
    let extension = inputFile.value.split('.').pop();
    if (extension !== "docx") { //front-end validation
        if (extension !== "") reportExtensionError();
        //modal with error message opens if file with bad extension is selected
        //extension equals to "" only if we just close choose file window, so modal with error is not required
    } else {
        spinner.className = "show";
        const formData = new FormData();
        formData.append('wordFile', inputFile.files[0]);
        fetch('https://docx2pdfapp.herokuapp.com/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                spinner.classList.remove("show"); //stop spinner loading
                if (response.ok) {
                    return response.json();
                } else (err){
                    throw new Error("Problem on server side", err);
                }
            })
            .then(data => {
                btnDownload.classList.add('btnDownloadActive');
                mailSection.classList.add('mailSectionActive');
                window.url = data.url; //update global variable url 
                window.fileName = data.fileName;
                conversionsNumber.innerHTML = `${data.conversionsNumber} <span>Documents Converted</span>`;
                btnDownload.addEventListener('click', downloadLink);
            })
            .catch(error => alert(error));
    }
});

function downloadLink() {
    if (url != "") {
        window.open(url, "_blank");
    }
}

function sendMail() {
    if (fileName != "") {
        if (inputMail.checkValidity()) {
            spinner2.className = "show";
            const formData = new FormData();
            formData.append('email', inputMail.value);
            formData.append('fileName', fileName);

            fetch('https://docx2pdfapp.herokuapp.com/sendmail', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    spinner2.classList.remove("show");
                    if (response.ok) {
                        alert("Mail sent successfully!");
                        mailSection.classList.add('mailSectionActive');
                        inputMail.value = "";
                    } else {
                        throw new Error("Error. Mail not sent");
                    }
                })
                .catch(error => alert(error));

        } else {
            alert("Please enter valid email!");
        }
    }
}

function closeModalWindow() {
    document.querySelector('.purchaseModalHeader').classList.add('invisibleElement');
    document.querySelector('.purchaseModalBody').classList.add('invisibleElement');
    document.querySelector('.purchaseModalFooter').classList.add('invisibleElement');
    document.querySelector('.purchaseModalContent').classList.add('modalFadeOut');
    setTimeout(() => {
        document.querySelector('.purchaseModal').style.display = 'none';
    }, 500)
}

function reportExtensionError() {
    document.querySelector('.purchaseModalHeader').classList.remove('invisibleElement');
    document.querySelector('.purchaseModalBody').classList.remove('invisibleElement');
    document.querySelector('.purchaseModalFooter').classList.remove('invisibleElement');
    document.querySelector('.purchaseModalContent').classList.remove('modalFadeOut');
    document.querySelector('.purchaseModal').style.display = "block";
    inputFile.value = "";
}