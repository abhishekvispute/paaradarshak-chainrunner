import React from 'react';
import { Modal, Button, Row, Col, AutoComplete, message, Input } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import sha256 from "crypto-js/sha256";
import CryptoJS from "crypto-js";

const { Title, Paragraph, Text } = Typography;

let tokenkeys;

class RootAuth extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            utilizeVisible: false, purpose: '', value: '', authority: '', authName: '', authAddr: '', funds: '', labels: [],
            mapAuthNametoAddress: {}, tokensAtThisAddress: []
        }
    }
    componentDidMount = async () => {

        const { accounts, contract } = this.props.web3;
        try {
            let l = [];
            let map = {};
            contract.methods.getAllListedAuthAddress().call({ from: accounts[0], gas: 3000000 })
                .then((result) => {

                    let i;
                    console.log(result);
                    for (i = 0; i < result.length; i++) {
                        let temp = result[i];
                        contract.methods.getSingleAuthDetails(temp).call({ from: accounts[0], gas: 3000000 })
                            .then((result) => {
                                l.push({ 'value': result['name'] })
                                map[result['name']] = temp;
                            })

                    }

                })
            this.setState({ labels: l })
            this.setState({ mapAuthNametoAddress: map })

            contract.methods.getAllTokenKeys().call({ from: accounts[0], gas: 3000000 })
                .then((result) => {
                    console.log(result);
                    tokenkeys = result
                })
                .then(() => {
                    let promises = [];
                    let i = 0;
                    for (i = 0; i < tokenkeys.length; i++) {
                        let value = tokenkeys[i];
                        promises.push(
                            new Promise((resolve, reject) => {
                                contract.methods.getSingleTokenDetails(value).call({ from: accounts[0], gas: 3000000 })
                                    .then((result) => {

                                        let temp
                                        temp = result.CompleteHistoryOfToken;
                                        if (accounts[0] == temp[temp.length - 1]._owner) {
                                            let t = this.state.tokensAtThisAddress;
                                            t.push({ "key": value, "value": temp[temp.length - 1].value })
                                            this.setState({ tokensAtThisAddress: t });
                                        }

                                    }).then(() => {
                                        console.log('resolve')
                                        resolve()
                                    })
                            }));


                    }
                    Promise.all(promises)
                        .then(() => {

                            console.log('resolve All')

                            let total = 0;
                            let i = 0;
                            for (i = 0; i < this.state.tokensAtThisAddress.length; i++) {
                                total = total + parseInt(this.state.tokensAtThisAddress[i].value);
                            }
                            this.setState({ funds: total })
                            let temp = this.state.tokensAtThisAddress;
                            temp.sort(function (a, b) {
                                return a.value.localeCompare(b.value);
                            });
                            this.setState(temp);
                            console.log(this.state.tokensAtThisAddress)


                        })

                })



        } catch (error) {
            // Catch any errors for any of the above operations.
            message.error('Sorry TX was not successful Please refer console')
            console.log('sad');
            console.error(error);
        }
    };

    handleUtilize = () => {

        try {
            const { accounts, contract } = this.props.web3;
            if (this.state.value > this.state.funds) { message.error('Insufficient Balance'); }
            else {
                let i = 0

                let breakp;
                let temp = 0;
                let aim = this.state.value;
                let currentbalance = this.state.funds;

                for (i = 0; i < this.state.tokensAtThisAddress.length; i++) {
                    temp = temp + parseInt(this.state.tokensAtThisAddress[i].value);
                    console.log(temp)
                    if (temp >= aim) {
                        breakp = i;
                        break;
                    }
                }
                console.log(temp)


                if (temp == aim) {
                    let k;
                    for (k = 0; k <= breakp; k++) {
                        contract.methods.transferToken(this.state.tokensAtThisAddress[k].key, '1', this.state.authority, this.state.purpose, this.state.mapAuthNametoAddress[this.state.authority]).send({ from: accounts[0], gas: 3000000 })
                            .then((receipt) => {

                                if (k == 0) {
                                    let newbal = this.state.funds - parseInt(aim);
                                    this.setState({ funds: newbal });
                                }

                            }).catch((error) => { console.log(error) })
                    }
                    this.setState({ utilizeVisible: false });

                }
                else if (temp > aim) {
                    message.success('There will be 2 TXs as we have to break the token in this case');
                    let t = temp - aim;
                    let requiredvaluedtoken = this.state.tokensAtThisAddress[breakp].value - t;
                    let uhash = sha256(accounts[0] + requiredvaluedtoken + Date.now());
                    uhash = uhash.toString(CryptoJS.enc.Hex);


                    contract.methods.breakToken(this.state.tokensAtThisAddress[breakp].key, requiredvaluedtoken, "0x" + uhash).send({ from: accounts[0], gas: 3000000 })
                        .then(() => {
                            let k;
                            for (k = 0; k <= breakp; k++) {
                                contract.methods.transferToken(this.state.tokensAtThisAddress[k].key, '1', this.state.authority, this.state.purpose, this.state.mapAuthNametoAddress[this.state.authority]).send({ from: accounts[0], gas: 3000000 })
                                    .then((receipt) => {
                                        if (k == 0) {
                                            let newbal = this.state.funds - parseInt(aim);
                                            this.setState({ funds: newbal });
                                        }

                                    })
                            }
                            this.setState({ transferVisible: false });
                        })
                }
                console.log(this.state.purpose, parseInt(this.state.value), this.state.authority);

            }

        }



        catch (error) {
            // Catch any errors for any of the above operations.
            message.error('Sorry TX was not successful Please refer console')
            console.log('sad');
            console.error(error);
        }



        // if (false) {
        //     // if the operation is unsuccessful
        //     message.error('The Operation was unsuccessful');
        // }
    }
    handleAddAuth = () => {

        // console.log(this.state.authName, this.state.authAddr);
        try {
            const { accounts, contract } = this.props.web3;
            contract.methods.addAuthority(this.state.authName, this.state.authAddr).send({ from: accounts[0], gas: 3000000 })
                .then((receipt) => {

                    message.success('New Authority Added Succesfully');
                    console.log(receipt)
                    let t = this.state.labels
                    t.push({ 'value': this.state.authName })
                    this.setState({ labels: t })

                    let t2 = this.state.mapAuthNametoAddress
                    t2[this.state.authName] = this.state.authAddr
                    this.setState({ mapAuthNametoAddress: t2 })

                    this.setState({ authName: '', authAddr: '' });

                })

        } catch (error) {
            // Catch any errors for any of the above operations.
            message.error('Sorry TX was not successful Please refer console')
            console.log('sad');
            console.error(error);
        }
        this.toggleVisibleAuth(false);


    }
    handleChange = (e, name) => {
        if (name == 'authority')
            this.setState({ [name]: e });
        else
            this.setState({ [name]: e.target.value })
    }
    toggleVisibleUtilize = (bool) => {
        this.setState({ utilizeVisible: bool })
    }
    toggleVisibleAuth = (bool) => {
        this.setState({ authVisible: bool })
    }
    render() {
        return (
            <div className="root-auth">
                <Row justify="space-around" align="middle">
                    <Col xs={6} sm={6} md={3}>

                        <Title level={2}>Root Authority</Title>
                        <Paragraph>
                            Root Authority is the one who owns the donated funds initially
                        </Paragraph>
                        <Paragraph>
                            <ul>
                                <li>
                                    They can Allot the funds over to branch authorities by
                                <Text code>Allot</Text>
                                </li>
                                <li>
                                    They can add branch authorities by <Text code>Add Authority</Text>
                                </li>
                            </ul>
                        </Paragraph>

                    </Col>

                    <Col xs={18} sm={12} md={12}>

                        <div className="fund-card">
                            <div className="fund-card-title">Remaining Funds</div>
                            <div className="fund-value">{this.state.funds}</div>
                        </div>
                        <br /><br />
                        <Button type="primary" onClick={() => this.toggleVisibleUtilize(true)}>Allot</Button>
                        <br /><br />
                        <Button type="primary" onClick={() => this.toggleVisibleAuth(true)}>Add Authority</Button>
                    </Col>
                </Row>
                <Modal
                    title="Allot Funds"
                    visible={this.state.utilizeVisible}
                    onOk={this.handleUtilize}
                    onCancel={() => this.toggleVisibleUtilize(false)}
                >
                    <Input name='purpose' onChange={(e) => this.handleChange(e, 'purpose')} value={this.state.purpose} placeholder='Purpose' /><br /><br />
                    <Input name='value' onChange={(e) => this.handleChange(e, 'value')} value={this.state.value} placeholder='Value' /><br /><br />
                    <AutoComplete
                        style={{
                            width: '100%',
                        }}
                        options={this.state.labels}
                        placeholder="Authority Name"
                        prefix={<UserOutlined />}
                        filterOption={(inputValue, option) =>
                            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                        }
                        value={this.state.authority}
                        onChange={(e) => this.handleChange(e, 'authority')}
                        name='authority' /><br /><br />
                </Modal>

                <Modal
                    title='Add Authority'
                    visible={this.state.authVisible}
                    onOk={this.handleAddAuth}
                    onCancel={() => this.toggleVisibleAuth(false)}
                >
                    <Input name='authName' onChange={(e) => this.handleChange(e, 'authName')} value={this.state.authName} placeholder='Name' /><br /><br />
                    <Input name='authAddr' onChange={(e) => this.handleChange(e, 'authAddr')} value={this.state.authAddr} placeholder='Address' /><br /><br />
                </Modal>
            </div>
        )
    }
}

export default RootAuth;