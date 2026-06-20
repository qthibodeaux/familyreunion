import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import InPlaceForm from "./InPlaceForm";

const InteractiveFormPage = () => {
  const { mode, anchorId } = useParams();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnchor = async () => {
      if (!anchorId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profile")
        .select("id, firstname, nickname, lastname, avatar_url, branch, ancestor")
        .eq("id", anchorId)
        .single();

      if (!error && data) {
        setAnchor(data);
      }
      setLoading(false);
    };

    fetchAnchor();
  }, [anchorId]);

  const handleClose = () => {
    navigate(`/profile/${anchorId || ''}`);
  };

  const handleSuccess = (result) => {
    console.log("Interactive Form Success:", result);
    navigate(`/profile/${anchorId || ''}`);
  };

  if (loading) {
    return (
      <div className="profile-bezel-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3e7b1' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="profile-bezel-card" style={{ padding: '24px', overflowY: 'auto' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <InPlaceForm
            mode={mode}
            anchor={anchor}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default InteractiveFormPage;
