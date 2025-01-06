import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';

const Avatar = () => {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [combo, setCombo] = useState('');
  const navigate = useNavigate();
  const { userid } = useParams();

  const handleLocalUpload = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result);
      setFile(file);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);

    setCombo(`${userid}.${fileName}`);
  };

  const handleSupabaseUpload = async () => {
    if (!file) return;

    setUploading(true);

    let fileName = `${userid}.${file.name.split('.').pop()}`;
    let retries = 0;

    while (true) {
      try {
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file);

        if (uploadError) {
          throw uploadError;
        }

        const { error: updateError } = await supabase
          .from('profile')
          .update({ avatar_url: fileName })
          .eq('id', userid);

        if (updateError) {
          throw updateError;
        }

        setUploading(false);
        navigate(`/profile/${userid}`);
        return;
      } catch (err) {
        if (err.statusCode === '409' && err.error === 'Duplicate') {
          retries++;
          fileName = `${userid}_${retries}.${file.name.split('.').pop()}`;
          continue; // Retry with new file name
        }

        console.error('Upload error:', err);
        setError(err.message);
        setUploading(false);
        return;
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ ...styles.avatarContainer, ...styles.roundedEdges }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" style={styles.avatarImage} />
        ) : (
          <div
            style={{ ...styles.avatarPlaceholder, ...styles.roundedEdges }}
          />
        )}
      </div>
      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        onChange={handleLocalUpload}
      />
      <div style={styles.buttonContainer}>
        <button
          style={styles.uploadButton}
          onClick={() => document.getElementById('fileInput').click()}
          disabled={uploading}
        >
          Upload Avatar
        </button>
        <button
          style={styles.uploadButton}
          onClick={handleSupabaseUpload}
          disabled={uploading}
        >
          Upload to Supabase
        </button>
      </div>
      {error && <p style={styles.error}>{error}</p>}
      <div>filename</div>
      {fileName}
      <div>combo</div>
      {combo}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
  },
  avatarContainer: {
    width: '150px',
    height: '150px',
    backgroundColor: 'black',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundedEdges: {
    borderRadius: '50%',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  uploadButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  fileName: {
    marginTop: '10px',
  },
};

export default Avatar;
