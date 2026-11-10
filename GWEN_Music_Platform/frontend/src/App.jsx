useEffect(() => {
  const loadTracks = async () => {
    try {
      const [uploadedResponse, jamendoResponse] = await Promise.all([
        fetch(`${API}/api/tracks`),
        fetch(`${API}/api/sources/jamendo`)
      ]);

      const uploadedTracks = uploadedResponse.ok
        ? await uploadedResponse.json()
        : [];

      const jamendoTracks = jamendoResponse.ok
        ? await jamendoResponse.json()
        : [];

      setTracks([
        ...jamendoTracks,
        ...uploadedTracks
      ]);

    } catch (error) {
      console.error("Failed to load GWEN music:", error);
      setTracks([]);
    }
  };

  loadTracks();
}, []);
