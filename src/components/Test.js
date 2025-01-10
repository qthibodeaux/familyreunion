import React from 'react';

function Test() {
  return (
    <div style={{ border: '1px solid black' }}>
      <h1>Todo</h1>
      <ul>
        <li>
          Profile
          <ul>
            <li>
              Connections
              <ul>
                <li>
                  Update addParent/Spouse/Child buttons to redirect to
                  MemberSearchForm
                </li>
              </ul>
            </li>
            <li>
              AddConnections
              <ul>
                <li>
                  Update addParent/Spouse/Child buttons to redirect to
                  MemberSearchForm
                </li>
              </ul>
            </li>
            <li>
              SettingsButton
              <ul>
                <li>Update to improve styling and functionality</li>
              </ul>
            </li>
            <li>
              DataTrees
              <ul>
                <li>Create</li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  );
}

export default Test;
