/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert'
import * as semver from 'semver'
import * as env from '../shared/vscode/env'

// Checks project config and dependencies, to remind us to remove old things
// when possible.
describe('tech debt', function () {
    function fixByDate(date: string, msg: string) {
        const now = Date.now()
        const cutoffDate = Date.parse(date)
        assert.ok(now <= cutoffDate, msg)
    }

    it('vscode minimum version', async function () {
        const minVscode = env.getMinVscodeVersion()

        assert.ok(
            semver.lt(minVscode, '1.75.0'),
            'remove filesystemUtilities.findFile(), use vscode.workspace.findFiles() instead (after Cloud9 VFS fixes bug)'
        )

        assert.ok(
            semver.lt(minVscode, '1.75.0'),
            'remove AsyncLocalStorage polyfill used in `spans.ts` if Cloud9 is on node 14+'
        )
    })

    it('nodejs minimum version', async function () {
        const minNodejs = env.getMinNodejsVersion()

        // XXX: available since node 16, but not sure how much work this will be, yet.
        assert.ok(
            semver.lt(minNodejs, '18.0.0'),
            'with node16+, we can now use AbortController to cancel Node things (child processes, HTTP requests, etc.)'
        )
    })

    it('remove separate sessions login edge cases', async function () {
        // src/auth/auth.ts:SessionSeparationPrompt
        // forgetConnection() function and calls
        fixByDate('2024-08-30', 'Remove the edge case code from the commit that this test is a part of.')
    })
})
