document.body.onpointerdown = () => {
   fetch (`/api/update`, {
      method: `POST`,
      headers: {
         "Content-Type": `application/json`
      },
      body: JSON.stringify ({ message: "hihihi !!! 🚀🚀🚀 from ctrl"})
   })
}