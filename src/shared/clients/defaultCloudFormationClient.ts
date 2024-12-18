/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CloudFormation } from 'aws-sdk'
import { ext } from '../extensionGlobals'
import '../utilities/asyncIteratorShim'
import { CloudFormationClient } from './cloudFormationClient'

export class DefaultCloudFormationClient implements CloudFormationClient {
    public constructor(public readonly regionCode: string) {}

    public async deleteStack(name: string): Promise<void> {
        const client = await this.createSdkClient()

        await client
            .deleteStack({
                StackName: name,
            })
            .promise()
    }

    public async *listStacks(): AsyncIterableIterator<CloudFormation.StackSummary> {
        const client = await this.createSdkClient()

        const request: CloudFormation.ListStacksInput = {
            // Every StackStatus except for DELETE_COMPLETE
            StackStatusFilter: [
                'CREATE_IN_PROGRESS',
                'CREATE_FAILED',
                'CREATE_COMPLETE',
                'ROLLBACK_IN_PROGRESS',
                'ROLLBACK_FAILED',
                'ROLLBACK_COMPLETE',
                'DELETE_IN_PROGRESS',
                'DELETE_FAILED',
                'UPDATE_IN_PROGRESS',
                'UPDATE_COMPLETE_CLEANUP_IN_PROGRESS',
                'UPDATE_COMPLETE',
                'UPDATE_ROLLBACK_IN_PROGRESS',
                'UPDATE_ROLLBACK_FAILED',
                'UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS',
                'UPDATE_ROLLBACK_COMPLETE',
                'REVIEW_IN_PROGRESS',
                'IMPORT_IN_PROGRESS',
                'IMPORT_COMPLETE',
                'IMPORT_ROLLBACK_IN_PROGRESS',
                'IMPORT_ROLLBACK_FAILED',
                'IMPORT_ROLLBACK_COMPLETE',
            ],
        }

        do {
            const response: CloudFormation.ListStacksOutput = await client.listStacks(request).promise()

            if (response.StackSummaries) {
                yield* response.StackSummaries
            }

            request.NextToken = response.NextToken
        } while (request.NextToken)
    }

    public async describeStackResources(name: string): Promise<CloudFormation.DescribeStackResourcesOutput> {
        const client = await this.createSdkClient()

        return await client
            .describeStackResources({
                StackName: name,
            })
            .promise()
    }

    private async createSdkClient(): Promise<CloudFormation> {
        return await ext.sdkClientBuilder.createAndConfigureServiceClient(
            options => new CloudFormation(options),
            undefined,
            this.regionCode
        )
    }
}