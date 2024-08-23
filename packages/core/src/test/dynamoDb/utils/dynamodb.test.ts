/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as sinon from 'sinon'
import * as assert from 'assert'
import { AWSError } from 'aws-sdk'
import { PromiseResult } from 'aws-sdk/lib/request'
import * as utilities from '../../../shared/utilities/messages'
import { ScanOutput, TableDescription } from 'aws-sdk/clients/dynamodb'
import { DynamoDbClient } from '../../../shared/clients/dynamoDbClient'
import { DynamoDbTableNode } from '../../../awsService/dynamoDb/explorer/dynamoDbTableNode'
import * as dynamoDbUtils from '../../../awsService/dynamoDb/utils/dynamodb'
import { deleteItem, dynamoDbConsoleUrl } from '../../../awsService/dynamoDb/utils/dynamodb'

function generateRequest<T>(output?: T): PromiseResult<T, AWSError> {
    return Promise.resolve(output) as unknown as PromiseResult<T, AWSError>
}

function getExpectedResult() {
    const expectedResult: dynamoDbUtils.TableData = {
        lastEvaluatedKey: undefined,
        tableContent: [{ age: '25', ID: '2', name: 'Jane' }],
        tableHeader: [
            { columnDataKey: 'age', title: 'age' },
            { columnDataKey: 'ID', title: 'ID' },
            { columnDataKey: 'name', title: 'name' },
        ],
    }
    return expectedResult
}

function getTableDescriptionResponse() {
    const getTableInformationResponse = {
        TableName: 'Table1',
        KeySchema: [
            { AttributeName: 'PK', KeyType: 'HASH' },
            { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
            { AttributeName: 'PK', AttributeType: 'S' },
            { AttributeName: 'SK', AttributeType: 'S' },
        ],
    } as unknown as TableDescription
    return getTableInformationResponse
}

describe('DynamoDbUtils', () => {
    let dynamoDbClient: DynamoDbClient
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
        dynamoDbClient = new DynamoDbClient('us-west-2')
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('getTableContent', function () {
        beforeEach(() => {
            sinon.restore()
            sandbox = sinon.createSandbox()
        })

        it('should retrieve the items from table and create tableData interface', async () => {
            const expectedScanResult = {
                Items: [{ age: { N: '25' }, ID: { S: '2' }, name: { S: 'Jane' } }],
            } as unknown as ScanOutput
            const scanTableStub = sinon.stub(dynamoDbClient, 'scanTable').resolves(generateRequest(expectedScanResult))
            const tableSchema: dynamoDbUtils.TableSchema = {
                partitionKey: { name: 'age', dataType: 'S' },
            }
            const actualResult = await dynamoDbUtils.getTableContent(
                { TableName: 'Users', Limit: 5 },
                '',
                tableSchema,
                dynamoDbClient
            )

            assert.ok(scanTableStub.called)
            assert.deepStrictEqual(actualResult, getExpectedResult())
        })

        it('Empty result should be handled', async () => {
            const expectedScanResult = {
                Items: [],
            } as unknown as ScanOutput
            sinon.stub(dynamoDbClient, 'scanTable').resolves(generateRequest(expectedScanResult))
            const tableSchema: dynamoDbUtils.TableSchema = {
                partitionKey: { name: 'age', dataType: 'S' },
            }
            const actualResult = await dynamoDbUtils.getTableContent(
                { TableName: 'Users', Limit: 5 },
                '',
                tableSchema,
                dynamoDbClient
            )

            const expectedResult: dynamoDbUtils.TableData = {
                lastEvaluatedKey: undefined,
                tableContent: [],
                tableHeader: [],
            }
            assert.deepStrictEqual(actualResult, expectedResult)
        })
    })

    describe('copyDynamoDbArn', function () {
        it('should copy ARN', async () => {
            const expectedResult = { TableName: 'Table1', TableArn: 'tablearn' } as unknown as TableDescription

            const dynamoDbTableNode = sinon.stub() as unknown as DynamoDbTableNode

            const getTableInformationStub = sinon.stub(dynamoDbClient, 'getTableInformation').resolves(expectedResult)

            await dynamoDbUtils.copyDynamoDbArn(dynamoDbTableNode, dynamoDbClient)
            assert.ok(getTableInformationStub.called)
        })

        it('shoudl not copy to clipboard', async () => {
            const expectedResult = { TableName: 'Table1' } as unknown as TableDescription

            const dynamoDbTableNode = sinon.stub() as unknown as DynamoDbTableNode
            const copyToClipboardStub = sinon.stub(utilities, 'copyToClipboard').resolves()

            const getTableInformationStub = sinon.stub(dynamoDbClient, 'getTableInformation').resolves(expectedResult)

            await dynamoDbUtils.copyDynamoDbArn(dynamoDbTableNode, dynamoDbClient)
            assert.ok(getTableInformationStub.called)
            assert.equal(copyToClipboardStub.called, false)
        })
    })

    describe('queryTableContent', function () {
        it('should query the table', async () => {
            const expectedQueryResult = {
                Items: [{ age: { N: '25' }, ID: { S: '2' }, name: { S: 'Jane' } }],
            } as unknown as ScanOutput
            const tableSchema: dynamoDbUtils.TableSchema = {
                partitionKey: { name: 'age', dataType: 'S' },
            }
            sinon.stub(dynamoDbClient, 'getTableInformation').resolves(getTableDescriptionResponse())
            sinon.stub(dynamoDbClient, 'queryTable').resolves(generateRequest(expectedQueryResult))
            const actualResult = await dynamoDbUtils.queryTableContent(
                { partitionKey: 'library', sortKey: 'as' },
                'regionCode',
                'tableName',
                tableSchema,
                undefined,
                dynamoDbClient
            )

            assert.deepStrictEqual(actualResult, getExpectedResult())
        })
    })

    describe('getTableKeySchema', function () {
        it('should extract key schema', async () => {
            sinon.stub(dynamoDbClient, 'getTableInformation').resolves(getTableDescriptionResponse())
            const actualResult = await dynamoDbUtils.getTableKeySchema('regionCode', 'ableName', dynamoDbClient)

            const expectedResult = {
                partitionKey: { name: 'PK', dataType: 'S' },
                sortKey: { name: 'SK', dataType: 'S' },
            }
            assert.deepStrictEqual(actualResult, expectedResult)
        })
    })

    describe('deleteItem', () => {
        beforeEach(() => {
            sandbox = sinon.createSandbox()
            dynamoDbClient = new DynamoDbClient('us-west-2')
        })

        afterEach(() => {
            sandbox.restore()
        })

        it('should delete item with partition key only', async () => {
            const deleteItemStub = sandbox.stub(dynamoDbClient, 'deleteItem').resolves()

            const tableName = 'TestTable'
            const selectedRow = { ID: '2' }
            const tableSchema = {
                partitionKey: { name: 'ID', dataType: 'S' },
            }
            const regionCode = 'us-west-2'

            await deleteItem(tableName, selectedRow, tableSchema, regionCode, dynamoDbClient)

            const expectedDeleteRequest = {
                TableName: tableName,
                Key: {
                    ID: { S: '2' },
                },
            }

            assert.ok(deleteItemStub.calledOnce)
            assert.deepStrictEqual(deleteItemStub.firstCall.args[0], expectedDeleteRequest)
        })

        it('should delete item with partition key and sort key', async () => {
            const deleteItemStub = sandbox.stub(dynamoDbClient, 'deleteItem').resolves()

            const tableName = 'TestTable'
            const selectedRow = { ID: '2', SortKey: '3' }
            const tableSchema = {
                partitionKey: { name: 'ID', dataType: 'S' },
                sortKey: { name: 'SortKey', dataType: 'S' },
            }
            const regionCode = 'us-west-2'

            await deleteItem(tableName, selectedRow, tableSchema, regionCode, dynamoDbClient)

            const expectedDeleteRequest = {
                TableName: tableName,
                Key: {
                    ID: { S: '2' },
                    SortKey: { S: '3' },
                },
            }

            assert.ok(deleteItemStub.calledOnce)
            assert.deepStrictEqual(deleteItemStub.firstCall.args[0], expectedDeleteRequest)
        })

        it('should handle missing sort key in schema', async () => {
            const deleteItemStub = sandbox.stub(dynamoDbClient, 'deleteItem').resolves()

            const tableName = 'TestTable'
            const selectedRow = { ID: '2' }
            const tableSchema = {
                partitionKey: { name: 'ID', dataType: 'S' },
            }
            const regionCode = 'us-west-2'

            await deleteItem(tableName, selectedRow, tableSchema, regionCode, dynamoDbClient)

            const expectedDeleteRequest = {
                TableName: tableName,
                Key: {
                    ID: { S: '2' },
                },
            }

            assert.ok(deleteItemStub.calledOnce)
            assert.deepStrictEqual(deleteItemStub.firstCall.args[0], expectedDeleteRequest)
        })
    })

    describe('dynamoDbConsoleUrl', () => {
        it('should generate correct DynamoDB console URL', () => {
            const dynamoDbTableNode = sinon.stub() as unknown as DynamoDbTableNode
            dynamoDbTableNode.dynamoDbtable = 'MyTable'

            const expectedUrl =
                'https://console.aws.amazon.com/dynamodb/home?region%3Dundefined#%2Ftables%3Aselected%3DMyTable'

            const result = dynamoDbConsoleUrl(dynamoDbTableNode)

            assert.strictEqual(result.toString(), expectedUrl)
        })
    })
})