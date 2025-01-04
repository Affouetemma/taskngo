(function() {
    // Create an iframe element
    var iframe = document.createElement('iframe');
    
    // Set the source URL of your app
    iframe.src = "https://taskngo.vercel.app/"; // Replace with your app's URL on Vercel
    iframe.width = "100%"; // Adjust width as needed
    iframe.height = "600px"; // Adjust height as needed
    iframe.style.border = "none";
    iframe.style.borderRadius = "10px"; // Optional: You can adjust the border-radius for rounded corners
    
    // Append the iframe to the body or a specific element
    document.body.appendChild(iframe);
})();
