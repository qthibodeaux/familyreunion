import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";
import { supabase } from "../../supabaseClient";
import AuthConsumer from "../../useSession";
import { format, isBefore } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { AnimatePresence, motion } from "framer-motion";
import useParentDirector from "../director/useParentDirector";
import "./ProfileWizard.css";

// Native HTML5 date pickers will be used

function ProfileWizard() {
  useParentDirector();
  const navigate = useNavigate();
  const { type, userid } = useParams();
  const { session } = AuthConsumer();
  const userId = session?.user?.id;
  const anchorId = userid || userId;

  // Step routing history stack
  const [history, setHistory] = useState(["NameForm"]);
  const currentStep = history[history.length - 1];
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Live input values
  const [firstName, setFirstName] = useState("");
  const [nickName, setNickName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sunrise, setSunrise] = useState(""); // YYYY-MM-DD
  const [sunset, setSunset] = useState("");   // YYYY-MM-DD
  const [hasGoneHome, setHasGoneHome] = useState(null); // true/false

  // Confirmed values (updates on confirmation to prevent card jitter)
  const [confirmedFirstName, setConfirmedFirstName] = useState("");
  const [confirmedNickName, setConfirmedNickName] = useState("");
  const [confirmedLastName, setConfirmedLastName] = useState("");
  const [confirmedSunrise, setConfirmedSunrise] = useState("");
  const [confirmedSunset, setConfirmedSunset] = useState("");

  // Validation feedback
  const [validationError, setValidationError] = useState("");

  // Payoff animation states
  const [playingPayoff, setPlayingPayoff] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile data of relative
  const [anchorProfile, setAnchorProfile] = useState(null);
  const [ancestor, setAncestor] = useState(null);

  // Safeguard Regex Rules & Helpers
  const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;
  const nicknameRegex = /^[a-zA-Z\s\-'"()]{1,50}$/;

  const formatName = (str) => {
    return str
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Viewport resize tracking removed in favor of inline flow

  // Fetch anchor profile & ancestor
  useEffect(() => {
    const fetchAnchorProfile = async () => {
      if (!anchorId) return;
      try {
        const { data, error } = await supabase
          .from("profile")
          .select(`
            id, firstname, lastname, branch, ancestor,
            ancestor_profile:ancestor (id, firstname, lastname)
          `)
          .eq("id", anchorId)
          .maybeSingle();

        if (!error && data) {
          setAnchorProfile(data);
          setAncestor(data.ancestor);
        }
      } catch (err) {
        console.error("Error fetching anchor profile:", err);
      }
    };
    fetchAnchorProfile();
  }, [anchorId]);

  // Sync date defaults when entering steps
  useEffect(() => {
    if (currentStep === "SunriseForm" && !sunrise) {
      setSunrise("1990-06-15");
      setConfirmedSunrise("1990-06-15");
    } else if (currentStep === "SunsetForm" && !sunset) {
      setSunset("2020-06-15");
      setConfirmedSunset("2020-06-15");
    }
  }, [currentStep, sunrise, sunset]);

  // Ordinal generator helper
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Badge label formatting
  const getBadgeText = () => {
    if (type === "self") {
      if (anchorProfile?.branch === 0) return "ROOTS · FOUNDER";
      return anchorProfile?.branch !== undefined && anchorProfile?.branch !== null
        ? `${getOrdinal(anchorProfile.branch + 1)} GEN · ${anchorProfile.ancestor_profile
            ? `${anchorProfile.ancestor_profile.firstname} ${anchorProfile.ancestor_profile.lastname}`
            : "SMITH LINE"
          }`.toUpperCase()
        : "CREATING PROFILE";
    }

    if (!anchorProfile) return "CREATING PROFILE";
    const anchorName = `${anchorProfile.firstname} ${anchorProfile.lastname}`.toUpperCase();

    if (type === "child") {
      const childBranch = anchorProfile.branch !== null && anchorProfile.branch !== undefined ? anchorProfile.branch + 1 : 0;
      const genNum = childBranch + 1;
      return `${getOrdinal(genNum)} GEN · ${anchorProfile.ancestor_profile
          ? `${anchorProfile.ancestor_profile.firstname} ${anchorProfile.ancestor_profile.lastname}`
          : anchorName
        }`.toUpperCase();
    }

    if (type === "spouse") {
      return `SPOUSE · ${anchorName}`;
    }

    if (type === "parent" || type === "smithparent") {
      const parentBranch = anchorProfile.branch !== null && anchorProfile.branch !== undefined ? Math.max(0, anchorProfile.branch - 1) : 0;
      const genNum = parentBranch + 1;
      return `${getOrdinal(genNum)} GEN · ${anchorProfile.ancestor_profile
          ? `${anchorProfile.ancestor_profile.firstname} ${anchorProfile.ancestor_profile.lastname}`
          : "SMITH LINE"
        }`.toUpperCase();
    }

    return "FAMILY MEMBER";
  };

  const getDisplayNameForQuestion = () => firstName || nickName || "they";

  const getPossessiveName = (name) => {
    if (!name) return "their";
    if (name.toLowerCase() === "you") return "your";
    return name.endsWith("s") ? `${name}'` : `${name}'s`;
  };

  // History / Navigation Controls
  const goBack = () => {
    if (history.length > 1) {
      setDirection(-1);
      const prevHistory = history.slice(0, -1);
      setHistory(prevHistory);
      setValidationError("");
    } else {
      navigate(-1);
    }
  };

  const handleNext = (nextStep) => {
    setDirection(1);
    setConfirmedFirstName(firstName);
    setConfirmedNickName(nickName);
    setConfirmedLastName(lastName);
    setConfirmedSunrise(sunrise);
    setConfirmedSunset(sunset);
    setValidationError("");
    setHistory((prev) => [...prev, nextStep]);
  };

  const jumpToStep = (stepName) => {
    const allPossibleSteps = [
      "NameForm",
      "NickNameForm",
      "FirstNameForm",
      "LastNameForm",
      "SunriseForm",
      "LivingDeceasedForm",
      "SunsetForm",
      "ConfirmCard",
    ];
    const targetIdx = allPossibleSteps.indexOf(stepName);
    const currentIdx = allPossibleSteps.indexOf(currentStep);

    setDirection(targetIdx > currentIdx ? 1 : -1);
    setValidationError("");

    const stepIdxInHistory = history.indexOf(stepName);
    if (stepIdxInHistory !== -1) {
      setHistory(history.slice(0, stepIdxInHistory + 1));
    } else {
      setHistory((prev) => [...prev, stepName]);
    }
  };

  const jumpToFirstName = () => {
    if (history.includes("FirstNameForm")) {
      jumpToStep("FirstNameForm");
    } else {
      jumpToStep("NameForm");
    }
  };

  // Step submissions with strict empty and regex guards
  const submitNameAsFirstName = (val) => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      setValidationError("Please enter a first name");
      return;
    }
    if (!nameRegex.test(trimmed)) {
      setValidationError("First names can only contain letters, hyphens, and apostrophes");
      return;
    }
    const formatted = formatName(trimmed);
    setFirstName(formatted);
    setConfirmedFirstName(formatted);
    handleNext("NickNameForm");
  };

  const submitNameAsNickName = (val) => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      setValidationError("Please enter a family nickname");
      return;
    }
    if (!nicknameRegex.test(trimmed)) {
      setValidationError("Nicknames can only contain letters, hyphens, and quotes");
      return;
    }
    const formatted = formatName(trimmed);
    setNickName(formatted);
    setConfirmedNickName(formatted);
    handleNext("FirstNameForm");
  };

  const submitNickName = (val) => {
    const trimmed = (val || "").trim();
    if (trimmed && !nicknameRegex.test(trimmed)) {
      setValidationError("Nicknames can only contain letters, hyphens, and quotes");
      return;
    }
    const formatted = trimmed ? formatName(trimmed) : "";
    setNickName(formatted);
    setConfirmedNickName(formatted);
    handleNext("LastNameForm");
  };

  const skipNickName = () => {
    setNickName("");
    setConfirmedNickName("");
    handleNext("LastNameForm");
  };

  const submitFirstName = (val) => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      setValidationError("First name cannot be blank");
      return;
    }
    if (!nameRegex.test(trimmed)) {
      setValidationError("First names can only contain letters, hyphens, and apostrophes");
      return;
    }
    const formatted = formatName(trimmed);
    setFirstName(formatted);
    setConfirmedFirstName(formatted);
    handleNext("LastNameForm");
  };

  const submitLastName = (val) => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      setValidationError("Last name cannot be blank");
      return;
    }
    if (!nameRegex.test(trimmed)) {
      setValidationError("Last names can only contain letters, hyphens, and apostrophes");
      return;
    }
    const formatted = formatName(trimmed);
    setLastName(formatted);
    setConfirmedLastName(formatted);
    handleNext("SunriseForm");
  };

  const submitSmithSide = () => {
    handleNext("SunriseForm");
  };

  const submitSunrise = () => {
    if (!sunrise) {
      setValidationError("Please select a valid date");
      return;
    }
    handleNextStepAfterSunrise(sunrise);
  };

  const handleNextStepAfterSunrise = (val) => {
    if (type === "self") {
      const birthDate = new Date(val);
      const ageDiffMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDiffMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (age < 18) {
        setValidationError("You must be 18 or older to register on the family portal. Minor profiles can be created in the tree, but cannot claim accounts.");
        return;
      }
      handleNext("ConfirmCard");
    } else {
      handleNext("LivingDeceasedForm");
    }
  };

  const submitLivingStatus = (deceased) => {
    setHasGoneHome(deceased);
    setTimeout(() => {
      if (deceased) {
        handleNext("SunsetForm");
      } else {
        setSunset("");
        setConfirmedSunset("");
        handleNext("ConfirmCard");
      }
    }, 300);
  };

  const submitSunset = () => {
    if (!sunset) {
      setValidationError("Please select a valid date");
      return;
    }
    handleNextStepAfterSunset(sunset);
  };

  const handleNextStepAfterSunset = (val) => {
    if (sunrise && isBefore(new Date(val), new Date(sunrise))) {
      setValidationError("Sunset date cannot be before sunrise date");
      return;
    }
    handleNext("ConfirmCard");
  };

  // Navigation pill confirmation
  const goNextFromPill = () => {
    if (currentStep === "NameForm") {
      submitNameAsFirstName(firstName);
    } else if (currentStep === "NickNameForm") {
      submitNickName(nickName);
    } else if (currentStep === "FirstNameForm") {
      submitFirstName(firstName);
    } else if (currentStep === "LastNameForm") {
      submitLastName(lastName);
    } else if (currentStep === "SunriseForm") {
      submitSunrise();
    } else if (currentStep === "SunsetForm") {
      submitSunset();
    }
  };

  // Save details to database
  const handleSaveProfile = async () => {
    setLoading(true);
    setValidationError("");

    const profileId = type === "self" ? userId : uuidv4();

    let profileData = {
      id: profileId,
      firstname: firstName,
      nickname: nickName || null,
      lastname: lastName,
      sunrise,
      sunset: sunset || null,
    };

    if (ancestor && (type === "smithparent" || type === "child")) {
      profileData.ancestor = ancestor;
    }

    if (type === "child") {
      try {
        const { data: parentProfile, error: parentProfileError } = await supabase
          .from("profile")
          .select("branch, ancestor")
          .eq("id", anchorId)
          .single();

        if (parentProfileError) {
          message.error("Error fetching parent profile: " + parentProfileError.message);
          setLoading(false);
          return;
        }

        profileData.parent = anchorId;
        if (parentProfile.ancestor) {
          profileData.ancestor = parentProfile.ancestor;
        } else {
          profileData.ancestor = anchorId;
        }

        if (parentProfile.branch !== null && parentProfile.branch !== undefined) {
          profileData.branch = parentProfile.branch + 1;
        } else {
          profileData.branch = null;
        }
      } catch (err) {
        console.error("Error loading parent details:", err);
      }
    }

    if (type === "smithparent") {
      if (anchorProfile && anchorProfile.branch !== null && anchorProfile.branch !== undefined) {
        profileData.branch = Math.max(0, anchorProfile.branch - 1);
      }
    }

    try {
      let profileError;
      if (type === "self") {
        ({ error: profileError } = await supabase
          .from("profile")
          .upsert({ id: userId, ...profileData }));
      } else {
        ({ error: profileError } = await supabase
          .from("profile")
          .insert([profileData]));
      }

      if (profileError) throw profileError;

      let connectionData;
      switch (type) {
        case "smithparent":
          connectionData = [
            { profile_1: profileId, profile_2: anchorId, connection_type: "child" },
            { profile_1: anchorId, profile_2: profileId, connection_type: "parent" },
          ];
          const { error: updateParentError } = await supabase
            .from("profile")
            .update({ parent: profileId })
            .eq("id", anchorId);
          if (updateParentError) throw updateParentError;
          break;

        case "spouse":
          connectionData = [
            { profile_1: anchorId, profile_2: profileId, connection_type: "spouse" },
            { profile_1: profileId, profile_2: anchorId, connection_type: "spouse" },
          ];
          break;

        case "parent":
          connectionData = [
            { profile_1: anchorId, profile_2: profileId, connection_type: "parent" },
            { profile_1: profileId, profile_2: anchorId, connection_type: "child" },
          ];
          break;

        case "child":
          connectionData = [
            { profile_1: anchorId, profile_2: profileId, connection_type: "child" },
            { profile_1: profileId, profile_2: anchorId, connection_type: "parent" },
          ];
          break;

        default:
          break;
      }

      if (connectionData) {
        let { error: connectionError } = await supabase
          .from("connection")
          .insert(connectionData);
        if (connectionError) throw connectionError;
      }

      // Done payoff animation
      setPlayingPayoff(true);

      setTimeout(() => {
        message.success("Profile saved successfully");
        setLoading(false);
        navigate(`/profile/${anchorId}`);
      }, 1200);

    } catch (error) {
      message.error("Error creating profile: " + error.message);
      setLoading(false);
    }
  };

  // Steps Progress dots list calculation
  const getStepsPath = () => {
    const path = ["NameForm"];
    if (history.includes("FirstNameForm")) {
      path.push("FirstNameForm");
    } else if (history.includes("NickNameForm")) {
      path.push("NickNameForm");
    } else {
      path.push("NickNameForm");
    }
    path.push("LastNameForm");
    path.push("SunriseForm");
    if (type !== "self") {
      path.push("LivingDeceasedForm");
      if (hasGoneHome) {
        path.push("SunsetForm");
      }
    }
    path.push("ConfirmCard");
    return path;
  };

  // Date picker display value helper
  const getPickerDisplayValue = (dateStr) => {
    return dateStr ? format(new Date(dateStr + "T00:00:00"), "MMMM d, yyyy") : "Select date";
  };

  // Steps rendering methods
  const renderNameForm = () => {
    const qText = type === "self" ? "What does the family call you?" : `What does the family call your ${type}?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="wizard-input-container">
          <input
            type="text"
            className={`wizard-input ${validationError ? "validation-failed" : ""}`}
            value={firstName || nickName || ""}
            onChange={(e) => {
              setFirstName(e.target.value);
              setValidationError("");
            }}
            placeholder="Enter name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitNameAsFirstName(firstName);
              }
            }}
          />
          {validationError && <span className="validation-error-hint">{validationError}</span>}
        </div>
        <div className="secondary-action-pills-row">
          <button type="button" className="secondary-action-pill" onClick={() => submitNameAsFirstName(firstName)}>
            First name?
          </button>
          <button type="button" className="secondary-action-pill" onClick={() => submitNameAsNickName(firstName)}>
            Nickname?
          </button>
        </div>
      </>
    );
  };

  const renderNickNameForm = () => {
    const qText = type === "self" ? "Do you have a family nickname?" : `Does ${getDisplayNameForQuestion()} have a family nickname?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="wizard-input-container">
          <input
            type="text"
            className="wizard-input"
            value={nickName}
            onChange={(e) => setNickName(e.target.value)}
            placeholder="Nickname (optional)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitNickName(nickName);
              }
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "1.0rem", justifyContent: "center", marginTop: "1.0rem" }}>
          <button type="button" className="wizard-primary-btn" onClick={() => submitNickName(nickName)}>
            Submit
          </button>
          <button type="button" className="wizard-back-btn" style={{ marginTop: 0 }} onClick={skipNickName}>
            No
          </button>
        </div>
      </>
    );
  };

  const renderFirstNameForm = () => {
    const qText = type === "self" ? "What is your first name?" : `What is their first name?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="wizard-input-container">
          <input
            type="text"
            className={`wizard-input ${validationError ? "validation-failed" : ""}`}
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setValidationError("");
            }}
            placeholder="First name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitFirstName(firstName);
              }
            }}
          />
          {validationError && <span className="validation-error-hint">{validationError}</span>}
        </div>
        <button type="button" className="wizard-primary-btn" onClick={() => submitFirstName(firstName)}>
          Submit
        </button>
      </>
    );
  };

  const renderLastNameForm = () => {
    const qText = type === "self" ? "What is your last name?" : `What is ${getDisplayNameForQuestion()}'s last name?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="wizard-input-container">
          <input
            type="text"
            className={`wizard-input ${validationError ? "validation-failed" : ""}`}
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setValidationError("");
            }}
            placeholder="Last name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitLastName(lastName);
              }
            }}
          />
          {validationError && <span className="validation-error-hint">{validationError}</span>}
        </div>
        <button type="button" className="wizard-primary-btn" onClick={() => submitLastName(lastName)}>
          Submit
        </button>
      </>
    );
  };

  const renderSmithSideForm = () => {
    return (
      <>
        <h2 className="step-question-text">Which side of the family?</h2>
        <p style={{ color: "var(--text)", marginBottom: "1.25rem" }}>Are they on the Smith side of your lineage?</p>
        <div className="gone-home-options-row" style={{ marginTop: 0 }}>
          <button type="button" className="gone-home-option-btn" onClick={() => submitSmithSide(true)}>
            Yes, Smith Side
          </button>
          <button type="button" className="gone-home-option-btn" onClick={() => submitSmithSide(false)}>
            No, Other Side
          </button>
        </div>
      </>
    );
  };

  const renderSunriseForm = () => {
    const qText = type === "self" ? "When did your story begin?" : `When did ${getPossessiveName(getDisplayNameForQuestion())} story begin?`;
    const displayVal = getPickerDisplayValue(sunrise);

    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--plum)", marginBottom: "0.5rem" }}>
          {displayVal}
        </div>
        {validationError && <span className="validation-error-hint" style={{ display: "block", marginBottom: "0.5rem" }}>{validationError}</span>}

        <div className="native-date-picker-container">
          <input
            type="date"
            className="wizard-date-input"
            value={sunrise}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              setSunrise(e.target.value);
              setConfirmedSunrise(e.target.value);
              setValidationError("");
            }}
          />
        </div>

        <button type="button" className="wizard-primary-btn" style={{ marginTop: "1.25rem" }} onClick={submitSunrise}>
          Submit
        </button>
      </>
    );
  };

  const renderLivingDeceasedForm = () => {
    const qText = `Has ${getDisplayNameForQuestion()} gone home?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="gone-home-options-row">
          <button type="button" className="gone-home-option-btn" onClick={() => submitLivingStatus(true)}>
            Yes, they have
          </button>
          <button type="button" className="gone-home-option-btn" onClick={() => submitLivingStatus(false)}>
            Still with us
          </button>
        </div>
      </>
    );
  };

  const renderSunsetForm = () => {
    const qText = `When did ${getDisplayNameForQuestion()} go home?`;
    const displayVal = getPickerDisplayValue(sunset);

    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--plum)", marginBottom: "0.5rem" }}>
          {displayVal}
        </div>
        {validationError && <span className="validation-error-hint" style={{ display: "block", marginBottom: "0.5rem" }}>{validationError}</span>}

        <div className="native-date-picker-container">
          <input
            type="date"
            className="wizard-date-input"
            value={sunset}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              setSunset(e.target.value);
              setConfirmedSunset(e.target.value);
              setValidationError("");
            }}
          />
        </div>

        <button type="button" className="wizard-primary-btn" style={{ marginTop: "1.25rem" }} onClick={submitSunset}>
          Submit
        </button>
      </>
    );
  };

  const renderConfirmCard = () => {
    const formattedSunriseStr = sunrise ? format(new Date(sunrise + "T00:00:00"), "MMMM d, yyyy") : "N/A";
    const formattedSunsetStr = sunset ? format(new Date(sunset + "T00:00:00"), "MMMM d, yyyy") : "N/A";

    return (
      <>
        <h2 className="step-question-text">Is this information correct?</h2>

        <div className="confirm-details-card">
          <div className="confirm-details-row">
            <span className="confirm-details-label">First Name</span>
            <span className="confirm-details-value">{firstName || "N/A"}</span>
          </div>
          {nickName && (
            <div className="confirm-details-row">
              <span className="confirm-details-label">Nickname</span>
              <span className="confirm-details-value">{nickName}</span>
            </div>
          )}
          <div className="confirm-details-row">
            <span className="confirm-details-label">Last Name</span>
            <span className="confirm-details-value">{lastName || "N/A"}</span>
          </div>
          <div className="confirm-details-row">
            <span className="confirm-details-label">Sunrise</span>
            <span className="confirm-details-value">{formattedSunriseStr}</span>
          </div>
          {sunset && (
            <div className="confirm-details-row">
              <span className="confirm-details-label">Sunset</span>
              <span className="confirm-details-value">{formattedSunsetStr}</span>
            </div>
          )}
        </div>

        <button type="button" className="wizard-primary-btn" onClick={handleSaveProfile} disabled={loading}>
          {loading ? "Saving..." : "Create profile"}
        </button>
      </>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "NameForm":
        return renderNameForm();
      case "NickNameForm":
        return renderNickNameForm();
      case "FirstNameForm":
        return renderFirstNameForm();
      case "LastNameForm":
        return renderLastNameForm();
      case "SmithSideForm":
        return renderSmithSideForm();
      case "SunriseForm":
        return renderSunriseForm();
      case "LivingDeceasedForm":
        return renderLivingDeceasedForm();
      case "SunsetForm":
        return renderSunsetForm();
      case "ConfirmCard":
        return renderConfirmCard();
      default:
        return null;
    }
  };

  // Card Bezel Markup
  const ProfileCardPreview = () => {
    const initials = `${firstName?.[0] || nickName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    const badgeText = getBadgeText();
    const hasName = confirmedFirstName || confirmedLastName || confirmedNickName;

    return (
      <div className="profile-card-preview-container">
        <div className={`preview-card-wrap ${playingPayoff ? "done-moment" : ""}`}>

          {playingPayoff && (
            <div className="checkmark-overlay">
              <svg className="checkmark-svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
          )}

          {/* Eyebrow */}
          <span className="preview-eyebrow">
            {badgeText}
          </span>

          <div className="preview-avatar-placeholder">
            <AnimatePresence mode="popLayout">
              {initials ? (
                <motion.span
                  key={initials}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.35 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="preview-spring-initials active"
                >
                  {initials}
                </motion.span>
              ) : (
                <motion.span
                  key="empty-avatar"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.3 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="preview-spring-initials"
                >
                  ?
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Identity details */}
          <div className="preview-identity-overlay">
            <AnimatePresence mode="wait">
              {hasName && (
                <motion.h1
                  key={`${confirmedFirstName}-${confirmedNickName}-${confirmedLastName}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="preview-name-text"
                >
                  {confirmedFirstName} {confirmedLastName}
                </motion.h1>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {confirmedNickName && (
                <motion.p
                  key={confirmedNickName}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="preview-nickname-text"
                >
                  "{confirmedNickName}"
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {confirmedSunrise && (
                <motion.div
                  key={`${confirmedSunrise}-${confirmedSunset}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="preview-lifespan-text"
                >
                  <span>{format(new Date(confirmedSunrise), "MMM d, yyyy")}</span>
                  {confirmedSunset && (
                    <>
                      <span>&mdash;</span>
                      <span>{format(new Date(confirmedSunset), "MMM d, yyyy")}</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  };

  // Framer Motion exit/enter variants
  const stepVariants = {
    enter: (dir) => ({
      opacity: 0,
      y: dir > 0 ? 20 : -30,
    }),
    center: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
    exit: (dir) => ({
      opacity: 0,
      y: dir > 0 ? -30 : 20,
      transition: { duration: 0.2, ease: "easeIn" },
    }),
  };

  return (
    <div className="profile-form-split-container">
      {/* Top/Left Hero Card Preview */}
      <ProfileCardPreview />

      {/* Bottom/Right Step Controller Container */}
      <div className="profile-form-step-container">
        {/* Progress dots row */}
        <div className="progress-dots-row">
          {getStepsPath().map((stepName, idx) => {
            let dotClass = "progress-dot";
            if (stepName === currentStep) {
              dotClass += " current";
            } else if (history.includes(stepName)) {
              dotClass += " completed";
            } else {
              dotClass += " upcoming";
            }
            return <div key={idx} className={dotClass} />;
          })}
        </div>

        {/* Wizard Form Cards */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="step-card"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Inline Navigation Control Bar */}
        <div className="wizard-navigation-inline-pill">
          <button
            type="button"
            className="floating-pill-nav"
            disabled={history.length === 1}
            onClick={goBack}
          >
            ← Back
          </button>

          <div className="floating-pill-chips">
            {confirmedFirstName && (
              <span className="name-chip" onClick={jumpToFirstName}>
                {confirmedFirstName}
              </span>
            )}
            {confirmedNickName && (
              <span className="name-chip" onClick={() => jumpToStep("NickNameForm")}>
                "{confirmedNickName}"
              </span>
            )}
            {confirmedLastName && (
              <span className="name-chip" onClick={() => jumpToStep("LastNameForm")}>
                {confirmedLastName}
              </span>
            )}
          </div>

          <button
            type="button"
            className="floating-pill-nav"
            disabled={currentStep === "ConfirmCard"}
            onClick={goNextFromPill}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileWizard;
