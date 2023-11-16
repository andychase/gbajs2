import { Button } from '@mui/material';
import { useContext } from 'react';

import { ModalBody } from './modal-body.tsx';
import { ModalFooter } from './modal-footer.tsx';
import { ModalHeader } from './modal-header.tsx';
import { ModalContext } from '../../context/modal/modal.tsx';

export const LegalModal = () => {
  const { setIsModalOpen } = useContext(ModalContext);
  const currentdata = new Date();
  const year = currentdata.getFullYear();

  return (
    <>
      <ModalHeader title="Legal" />
      <ModalBody>
        <p>
          This legal disclaimer ("Disclaimer") governs your use of Gbajs3 ("the
          Emulator"), a browser-based emulator for the Game Boy Advance console.
          By accessing or using the Emulator, you acknowledge and agree to be
          bound by this Disclaimer. If you do not agree with any part of this
          Disclaimer, you must not use the Emulator.
        </p>

        <ol>
          <li>
            <p>
              Open Source Project:
              <br />
              The Emulator is an open-source project, built upon various
              open-source projects mentioned below. It is developed and
              maintained by Nicholas VanCise. The Emulator is provided to you
              free of charge for personal, non-commercial use.
            </p>
          </li>

          <li>
            <p>
              Ownership and Intellectual Property:
              <br />
              The Emulator, including its design, codebase, and user interface,
              is owned by Nicholas VanCise and is protected by intellectual
              property laws. All rights not expressly granted to you under this
              Disclaimer are reserved by Nicholas VanCise.
            </p>
          </li>

          <li>
            <p>
              No Distribution of Game Boy Advance ROMs:
              <br />
              The Emulator does not provide or distribute any Game Boy Advance
              ROMs or copyrighted game software for public consumption. You must
              obtain Game Boy Advance ROMs from legal sources and ensure
              compliance with applicable laws regarding the use of copyrighted
              materials.
            </p>
          </li>

          <li>
            <p>
              Account Feature:
              <br />
              The Emulator includes an account feature that allows registered
              users to store ROMs and save files. To access this feature, you
              must have a valid account. Unauthorized access or attempts to log
              into the server without a valid account may result in temporary
              bans.
            </p>
          </li>

          <li>
            <p>
              Limitation of Liability:
              <br />
              THE EMULATOR IS PROVIDED "AS IS" WITHOUT ANY EXPRESS OR IMPLIED
              WARRANTIES, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF
              MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. Nicholas
              VanCise AND CONTRIBUTORS TO THE EMULATOR SHALL NOT BE LIABLE FOR
              ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
              CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
              OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
              BUSINESS INTERRUPTION) ARISING IN ANY WAY OUT OF THE USE OF THE
              EMULATOR, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </li>

          <li>
            <p>
              Open-Source Projects:
              <br />
              The Emulator is based on the following open-source projects:
            </p>
            <ol>
              <li>
                <p>
                  <a href="https://github.com/endrift/gbajs">
                    Endrift's GBA.js
                  </a>{' '}
                  (Copyright © 2012 – 2013, Jeffrey Pfau)
                </p>
              </li>
              <li>
                <p>
                  <a href="https://github.com/endrift/mgba">Endrift's mGBA</a>{' '}
                  (Copyright © 2013 – 2018, Jeffrey Pfau)
                </p>
              </li>
              <li>
                <p>
                  <a href="https://github.com/andychase/gbajs2">
                    Andychase's GBA.js2
                  </a>{' '}
                  (Copyright © 2020, Andrew Chase)
                </p>
              </li>
            </ol>
            <p>
              These projects are distributed under their respective licenses.
              Please refer to the individual repositories for more information
              on the licenses and terms of use.
            </p>
          </li>

          <li>
            <p>
              Severability:
              <br />
              If any provision of this Disclaimer is found to be unenforceable
              or invalid under any applicable law, such unenforceability or
              invalidity shall not render this Disclaimer unenforceable or
              invalid as a whole. Such provisions shall be deleted without
              affecting the remaining provisions herein.
            </p>
          </li>

          <li>
            <p>
              Governing Law:
              <br />
              This Disclaimer shall be governed by and construed in accordance
              with the laws of the United States of America, without regard to
              its conflict of laws principles.
            </p>
          </li>
        </ol>

        <p>
          By using the Emulator, you agree to comply with this Disclaimer and
          any applicable laws and regulations. If you have any questions or
          concerns regarding this Disclaimer, please use the contact feature of
          this website and open an issue in GitHub.
        </p>

        <p>Last updated: June 22 2023</p>

        <p>© {year}, Nicholas VanCise. All rights reserved.</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="outlined" onClick={() => setIsModalOpen(false)}>
          Close
        </Button>
      </ModalFooter>
    </>
  );
};
