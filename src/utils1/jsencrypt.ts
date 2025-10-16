import JSEncrypt from 'jsencrypt'

// 密钥对生成 http://web.chacuo.net/netrsakeypair

const publicKey = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8hKyRc3EO/ByMeQx5+fiIql3K\n" +
  "rPrLvKGVGg/fRZaqMQijbem24v6fOEM2EKS5fD6xxYduZU4ddjofCbzn75F239El\n" +
  "Wqgz+GBsPFSEpTs+o9lWj0ZcEe6KYqMO8jwfzgfRRkPDYnPfdOyvG9ubSmYClYIr\n" +
  "PPFsxhSQpKb1STBvQQIDAQAB";

const privateKey
  = "MIICdQIBADANBgkqhkiG9w0BAQEFAASCAl8wggJbAgEAAoGBALyErJFzcQ78HIx5\n" +
  "DHn5+IiqXcqs+su8oZUaD99FlqoxCKNt6bbi/p84QzYQpLl8PrHFh25lTh12Oh8J\n" +
  "vOfvkXbf0SVaqDP4YGw8VISlOz6j2VaPRlwR7opiow7yPB/OB9FGQ8Nic9907K8b\n" +
  "25tKZgKVgis88WzGFJCkpvVJMG9BAgMBAAECgYBPu/HdRy1vgBR3GY+8W4zSCPTI\n" +
  "j2c4Gt1g2fgSoDU8YKbdsNRkJRg6sapDyMBTL4i42eoROEnUzjeA/zZmBv7HxbOY\n" +
  "PLkO9R7roVJc98Lk9sbUOV6JALf/CFSok82fB0ww9Ut/2NL2+s7/u9yo2171hj5n\n" +
  "b+sLEvsXzM+jPh3C0QJBAOIRokKwpA5BzmnrO2tLezX06BC/WgrLV5yMjKvYlvC3\n" +
  "eahq4dFB8NZv9ptaSEHRStDiwRDms0pOj60KftqlM7UCQQDVek0uzcY3xe4MgL3c\n" +
  "X2ChZp2mKyXU7IH76AI/Yu03+iUCtE6btPMGyymS8eYjD5kDBya7K34IuYmujdLk\n" +
  "HxzdAkB0FsYSJQ852wUaUxeCM5Kj1I3O+9RLMrxcwbgDDwgDuNQabjhj8s6v73Ld\n" +
  "t/DfC5C1z5uBCFcNU2ZoX7lgofD5AkBGahXlV0iHgwj3JMv7UZZ9Bmz/r4HGDtD9\n" +
  "N1TudYILkb39e13mbDQxTHgFGTcw32c4IXa8DCeBVzm70tn6Fu0dAkA+8Clu/m+v\n" +
  "gpEnRCJUDagxw7RyWqfYg5jAhQ7O/yYOR0p6QGI+ER/9KmT9yP7ZXCDA3/xeGWAs\n" +
  "XGQRpX0//lVO";

// 加密
export function encrypt(txt: string) {
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(publicKey) // 设置公钥
  return encryptor.encrypt(txt).toString() // 对数据进行加密
}

// 解密
export function decrypt(txt: string) {
  const encryptor = new JSEncrypt()
  encryptor.setPrivateKey(privateKey) // 设置私钥
  return encryptor.decrypt(txt).toString() // 对数据进行解密
}

