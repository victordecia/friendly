var express = require('express'),
	bodyParser = require('body-parser')

const port = 3000

/*
|--------------------------------------------------------------------------
| Configurações do servidor
|--------------------------------------------------------------------------
*/
const app = express()
app.use(bodyParser.json())
app.use(function(req, res, next){
	res.setHeader("Access-Control-Allow-Origin", "*")
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE")
	res.setHeader("Access-Control-Allow-Headers", "content-type")
	res.setHeader("Access-Control-Allow-Credentials", true)
	next()
})

app.listen(port, () => {
    console.log('Servidor HTTP esta escutando na porta ' + port)
})

/*
|--------------------------------------------------------------------------
| DB local
|--------------------------------------------------------------------------
*/

const tablePerson = createDatabaseTable()

/* CENÁRIO DE TESTE *
var pessoateste1 = createPerson({cpf:'11111111111', name:'A'})
var pessoateste2 = createPerson({cpf:'22222222222', name:'B'})
var pessoateste3 = createPerson({cpf:'33333333333', name:'C'})
var pessoateste4 = createPerson({cpf:'44444444444', name:'D'})
var pessoateste5 = createPerson({cpf:'55555555555', name:'E'})
tablePerson.create(pessoateste1)
tablePerson.create(pessoateste2)
tablePerson.create(pessoateste3)
tablePerson.create(pessoateste4)
tablePerson.create(pessoateste5)
pessoateste1.relations = createRelationship(pessoateste1, pessoateste2)
pessoateste1.relations = createRelationship(pessoateste1, pessoateste3)
pessoateste2.relations = createRelationship(pessoateste2, pessoateste1)
pessoateste2.relations = createRelationship(pessoateste2, pessoateste4)
pessoateste3.relations = createRelationship(pessoateste3, pessoateste1)
pessoateste3.relations = createRelationship(pessoateste3, pessoateste4)
pessoateste3.relations = createRelationship(pessoateste3, pessoateste5)
pessoateste4.relations = createRelationship(pessoateste4, pessoateste2)
pessoateste4.relations = createRelationship(pessoateste4, pessoateste3)
pessoateste5.relations = createRelationship(pessoateste5, pessoateste3)
*/
/**
 * Factory para criação de uma tabela do simulador do DB
 */
function createDatabaseTable() {
	const table = {}
	var objects = []

	table.create = function (elem) {
		objects.push(elem)
	}

	table.findByProperty = function (property, propertyValue) {
		return objects.find(el => el[property] === propertyValue)
	}

	table.updateObjectByProperty = function (property, propertyValue, newObject) {
		return objects.find((el, i) => {
			if (el[property] === propertyValue) {
				objects[i] = newObject
				return true
			}
		})
	}

	table.isExistingObject = function (property, propertyValue) {
		return objects.some(el => el[property] === propertyValue)
	}

	table.selectAll = function () {
		return objects
	}

	table.delete = function () {
		objects = []
		return 
	}

	return table
}

/**
 * Factory para criação de Person
 */
function createPerson(personInfo) {
	const person = {}

	person.cpf = personInfo.cpf
	person.name = personInfo.name??''
	person.relations = personInfo.relations??[]

	return person
}

function createRelationship(person1, person2){
	const isRelationExisting = person1.relations.some(el => el === person2.cpf)
	
	if (isRelationExisting) 
		return person1.relations
	
	person1.relations.push(person2.cpf)
	tablePerson.updateObjectByProperty('cpf', person1.cpf, person1)

	return person1.relations
}

function getRecommendations(person) {
	const friendsCPFList = person.relations
	var friendOfFriends = []

	for (const friendCPF of friendsCPFList) {
		let friend = tablePerson.findByProperty('cpf', friendCPF)
		let filteredRelations = friend.relations.filter(
			cpf => (cpf != person.cpf && !friendsCPFList.includes(cpf))
		)
		friendOfFriends = friendOfFriends.concat(filteredRelations)
	}
	console.log(friendOfFriends)

	const recommendationsScore = friendOfFriends.reduce(
		(recommendation,cpf)=>({...recommendation, [cpf]:(recommendation[cpf] | 0) + 1}),{}
	)
	console.log(recommendationsScore)

	const recommendationCPFList = Object.keys(recommendationsScore)
	recommendationCPFList.sort(function(a, b) { 
		return recommendationsScore[b] - recommendationsScore[a] 
	})

	return recommendationCPFList
}

/*
|--------------------------------------------------------------------------
| Validadores
|--------------------------------------------------------------------------
*/

function isInputPersonValid(input) {
	if (input.cpf === undefined) return false
	return true
}

function isInputRelationValid(input) {
	if (input.cpf1 === undefined) return false
	if (input.cpf2 === undefined) return false
	return true
}

function sanitizeCpf(cpf) {
	return cpf.replace(/[^0-9]/g,"")
}

function isCPFValid(cpf) {
	const cpfFormatado = sanitizeCpf(cpf)
	if (cpfFormatado.length != 11) return false
	return true
}

/*
|--------------------------------------------------------------------------
| Endpoints
|--------------------------------------------------------------------------
*/

app.get('/', function(req, res) {
	console.log(tablePerson.selectAll())
	res.json({
		"msg": "Sistema que permite que uma pessoa obtenha sugestões de novos amigos se baseando nas amizades já existentes.",
		"date": new Date().toUTCString()
	})
})

app.post('/person', function(req, res){
	if (!isInputPersonValid(req.body))
		return res.status(400).send()

	if (!isCPFValid(req.body.cpf))
		return res.status(400).send('CPF inválido: não possui 11 dígitos')
	
	if (tablePerson.isExistingObject('cpf', sanitizeCpf(req.body.cpf)))
		return res.status(400).send('Usuário já cadastrado')

	const person = createPerson({cpf: sanitizeCpf(req.body.cpf), name: req.body.name})
	tablePerson.create(person)
	
	return res.send(person)
})

app.get('/person/:cpf', function(req, res){
	if (!isInputPersonValid(req.params))
		return res.status(400).send()

	if (!tablePerson.isExistingObject('cpf', sanitizeCpf(req.params.cpf)))
		return res.status(404).send()

	const person = tablePerson.findByProperty('cpf', sanitizeCpf(req.params.cpf))
	return res.send(person)
})

app.delete('/clean', function(req, res){
	tablePerson.delete()
	return res.send(tablePerson.selectAll())
})

app.post('/relationship', function(req, res){
	if (!isInputRelationValid(req.body))
		return res.status(400).send()
	
	if (!tablePerson.isExistingObject('cpf', sanitizeCpf(req.body.cpf1)))
		return res.status(404).send('cpf1 não encontrado')
	
	if (!tablePerson.isExistingObject('cpf', sanitizeCpf(req.body.cpf2)))
		return res.status(404).send('cpf2 não encontrado')
	
	var person1 = createPerson(
		tablePerson.findByProperty('cpf', sanitizeCpf(req.body.cpf1))
	)
	var person2 = createPerson(
		tablePerson.findByProperty('cpf', sanitizeCpf(req.body.cpf2))
	)

	person1.relations = createRelationship(person1, person2)
	person2.relations = createRelationship(person2, person1)

	return res.send(tablePerson.selectAll())
})

app.get('/recommendations/:cpf', function(req, res){
	if (!isCPFValid(req.params.cpf))
		return res.status(400).send('CPF inválido: não possui 11 dígitos')
	
	if (!tablePerson.isExistingObject('cpf', sanitizeCpf(req.params.cpf)))
		return res.status(404).send('Usuário não existe')

	const person = tablePerson.findByProperty('cpf', sanitizeCpf(req.params.cpf))
	const recommendations = getRecommendations(person)

	return res.send(recommendations)
})